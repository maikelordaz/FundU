// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IFeeManager {
    event FeeCollected(uint256 feeCollected, address indexed token);

    function collectFee(uint256 depositAmount, address tokenAddress) external;

    function withdrawFees(address tokenToWithdraw) external;

    function setNewFeeManager(address _newManager) external;

    function setNewTransactionFee(uint256 _newTransactionFee) external;

    function mustHaveBalance(uint256 deposit) external view returns (uint256);

    function getProtocolManager() external view returns (address);

    function getFeeManager() external view returns (address);

    function getTransactionFee() external view returns (uint256);
}
