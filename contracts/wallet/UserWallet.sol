// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {FundUtils} from "../utils/FundUtils.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFeeManager} from "../interfaces/IFeeManager.sol";

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract UserWallet is ReentrancyGuard, FundUtils {
    using SafeERC20 for IERC20;

    address private s_protocolManager;

    // Tokens allowed on protocol
    address public immutable i_USDC;
    address public immutable i_USDT;
    IERC20 private immutable USDC;
    IERC20 private immutable USDT;

    // Fee manager
    address private s_feeManager;
    IFeeManager public feeManager;

    // Funding wallet
    // user => (tokenAddress => balance)
    mapping(address => mapping(address => uint256)) public s_userBalanceByToken;

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

    constructor(address _USDC, address _USDT, address _protocolManager, address _feeManager) {
        i_USDC = _USDC;
        i_USDT = _USDT;

        USDC = IERC20(i_USDC);
        USDT = IERC20(i_USDT);

        s_protocolManager = _protocolManager;

        s_feeManager = _feeManager;
        feeManager = IFeeManager(s_feeManager);

        // Infinite approvals
        USDC.safeIncreaseAllowance(address(feeManager), type(uint256).max);
        USDT.safeIncreaseAllowance(address(feeManager), type(uint256).max);
    }

    /*** MAIN FUNCTIONS ***/
    /*** WALLET RELATED ***/
    /**
     * @notice A method to fund the wallet
     * @param deposit The amount to fund the wallet
     * @param tokenAddress The token to fund
     * @dev It fails if the token is not USDC or USDT
     * @dev It fails if the deposit is "0"
     */
    function depositOnWallet(uint256 deposit, address tokenAddress) external returns (uint256) {
        require(deposit != 0, "Wallet: Zero amount");
        require(tokenAddress == i_USDC || tokenAddress == i_USDT, "Wallet: Only USDC and USDT");

        s_userBalanceByToken[msg.sender][tokenAddress] += deposit;

        IERC20 token = IERC20(tokenAddress);
        token.safeTransferFrom(msg.sender, address(this), deposit);

        emit WalletDeposit(deposit, tokenAddress, msg.sender);
        return deposit;
    }

    /**
     * @notice A method to withdraw from wallet
     * @param amount The amount to withdraw from wallet
     * @param tokenAddress The token to withdrw
     * @dev It fails if the token is not USDC or USDT
     * @dev It fails if the amount is "0"
     * @dev It fails if the user does not have enough balance
     */
    function withdrawFromWallet(
        uint amount,
        address tokenAddress
    ) external nonReentrant returns (uint256) {
        require(amount != 0, "Wallet: Zero amount");
        require(tokenAddress == i_USDC || tokenAddress == i_USDT, "Wallet: Only  USDC and USDT");
        require(
            s_userBalanceByToken[msg.sender][tokenAddress] >= amount,
            "Wallet: Not enough balance"
        );

        s_userBalanceByToken[msg.sender][tokenAddress] -= amount;

        IERC20 token = IERC20(tokenAddress);
        token.safeTransfer(msg.sender, amount);

        emit WalletWithdraw(amount, tokenAddress, msg.sender);
        return amount;
    }

    /*** FEE MANAGER RELATED ***/

    function setNewFeeManagerAddress(address newManager) external onlyProtocolManager {
        require(
            newManager != address(0x00) && newManager != s_feeManager && newManager != msg.sender,
            "Wallet: Invalid Manager address"
        );

        // Resetting to zero the actual feeManager
        USDC.safeDecreaseAllowance(address(feeManager), 0);
        USDT.safeDecreaseAllowance(address(feeManager), 0);

        // Set the new feeManager and infinite approves to every token
        s_feeManager = newManager;
        feeManager = IFeeManager(s_feeManager);

        USDC.safeIncreaseAllowance(address(feeManager), type(uint256).max);
        USDT.safeIncreaseAllowance(address(feeManager), type(uint256).max);
    }

    /*** VIEW / PURE FUNCTIONS ***/

    /*** USER´S INFO ***/
    /**
     * @notice A method to know user´s balances
     * @param token The token to know user´s balance
     */
    function getWalletBalance(address token) public view returns (uint256) {
        return s_userBalanceByToken[msg.sender][token];
    }

    /*** TOKEN´S INFO ***/

    function getUsdcAddress() public view returns (address) {
        return i_USDC;
    }

    function getUsdtAddress() public view returns (address) {
        return i_USDT;
    }
}
