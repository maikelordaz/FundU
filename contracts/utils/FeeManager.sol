// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract FeeManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address private s_protocolManager;
    address private s_feeManager;
    uint8 private s_transactionFee;

    // Tokens allowed on protocol
    address private immutable i_USDC;
    address private immutable i_USDT;

    mapping(address => uint256) public s_protocolBalanceByToken; // tokenAddress => balance

    event FeeCollected(uint256 feeCollected, address indexed token);
    event NewFeeManager(address indexed newManager);
    event NewTransactionFee(uint8 newTransactionFee);

    /**
     * @notice To check the fee manager is the appropiate
     */
    modifier onlyFeeManager() {
        require(msg.sender == s_feeManager, "FeeManager: Only the fee managers allowed");
        _;
    }

    /**
     * @notice To check the protocol Manager is the appropiate
     */
    modifier onlyProtocolManager() {
        require(
            msg.sender == s_protocolManager,
            "FeeManager: Only the protocol manager is allowed"
        );
        _;
    }

    /**
     * @param _protocolManager the address of the Protocol Manager
     * @param _feeManager the address of the Fee Manager
     * @param _fee the transaction fee
     * @param _USDC USDC token address
     * @param _USDT USDT token address
     */
    constructor(
        uint8 _fee,
        address _protocolManager,
        address _feeManager,
        address _USDC,
        address _USDT
    ) {
        require(
            _protocolManager != address(0x00) &&
                _feeManager != address(0x00) &&
                _feeManager != address(this),
            "FeeManager: Invalid mannagers address"
        );
        require(_fee != 0, "FeeManager: Invalid fee");

        s_protocolManager = _protocolManager;
        s_feeManager = _feeManager;
        s_transactionFee = _fee;

        i_USDC = _USDC;
        i_USDT = _USDT;
    }

    /*** MAIN FUNCTIONS ***/

    /*** COLLECT FEES RELATED ***/
    /**
     * @notice Called when a stream or instant payment is created
     * @param depositAmount the amount of fee collected
     * @param tokenAddress the  token address
     * @dev No need to check depositAmount because the amount is require to be bigger than zero
     * when you create a stream
     */
    function collectFee(uint256 depositAmount, address tokenAddress) external {
        uint256 _feeCollected = (depositAmount * s_transactionFee) / 100;

        //uint256 _feeCollected = depositAmount - realAmount;

        s_protocolBalanceByToken[tokenAddress] += _feeCollected;

        IERC20 token = IERC20(tokenAddress);

        token.safeTransferFrom(msg.sender, address(this), _feeCollected);

        emit FeeCollected(_feeCollected, tokenAddress);
    }

    /*** REDEEM FEES COLLECTED RELATED ***/
    /**
     * @notice A method to withdraw balance from only one token
     * @param tokenToWithdraw The token itself
     * @dev It fails if there is no balance in the token
     */
    function withdrawFees(address tokenToWithdraw) external onlyFeeManager nonReentrant {
        require(
            s_protocolBalanceByToken[tokenToWithdraw] > 0,
            "FeeManager: Zero balance for this token"
        );

        uint256 toWithdraw = s_protocolBalanceByToken[tokenToWithdraw];

        s_protocolBalanceByToken[tokenToWithdraw] = 0;

        IERC20 token = IERC20(tokenToWithdraw);

        token.safeTransfer(s_feeManager, toWithdraw);
    }

    /*** NEW SETTINGS RELATED ***/
    /**
     * @notice a function to set new managers to control the fees
     * @param _newManager the new manager
     */
    function setNewFeeManager(address _newManager) external onlyProtocolManager {
        require(
            _newManager != address(0x00) && _newManager != address(this),
            "FeeManager: Invalid manager address"
        );
        s_feeManager = _newManager;
        emit NewFeeManager(_newManager);
    }

    /**
     * @notice a function to set new transaction fees
     * @param _newTransactionFee the new fee
     */
    function setNewTransactionFee(uint8 _newTransactionFee) external onlyFeeManager {
        require(_newTransactionFee != 0 && _newTransactionFee <= 100, "FeeManager: Invalid fee");

        s_transactionFee = _newTransactionFee;
        emit NewTransactionFee(_newTransactionFee);
    }

    /*** VIEW / PURE FUNCTIONS ***/

    function mustHaveBalance(uint256 deposit) external view returns (uint256) {
        uint256 needed = deposit + ((deposit * s_transactionFee) / 100);
        return needed;
    }

    function getProtocolManager() external view returns (address) {
        return s_protocolManager;
    }

    function getFeeManager() external view returns (address) {
        return s_feeManager;
    }

    function getTransactionFee() external view returns (uint256) {
        return s_transactionFee;
    }
}
