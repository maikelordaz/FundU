// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

contract FundUtils {
    enum StreamStatus {
        Active,
        Paused,
        Canceled,
        Completed
    }

    /*
     * It refer to an instant payment when:
     * startTime === stopTime
     * balanceLeft === 0
     * StreamStatus === Completed
     */
    struct StreamData {
        uint256 deposit;
        uint256 balanceLeft; // If no withdraws must be equal to deposit
        uint256 startTime;
        uint256 stopTime;
        address beneficiary;
        address owner;
        address tokenAddress;
        StreamStatus status;
    }

    event WalletDeposit(uint256 deposit, address indexed token, address indexed user);

    event WalletWithdraw(uint256 amount, address indexed token, address indexed user);

    event NewStream(
        uint256 indexed streamID,
        address indexed owner,
        address indexed beneficiary,
        uint256 depositedAmount,
        address token,
        uint256 startTime,
        uint256 stopTime,
        StreamStatus status
    );

    event PauseStream(uint256 indexed streamID, address indexed owner, address indexed beneficiary);

    event ResumeStream(
        uint256 indexed streamID,
        address indexed owner,
        address indexed beneficiary,
        bool paid
    );

    event CancelStream(
        uint256 indexed streamID,
        address indexed owner,
        address indexed beneficiary,
        uint256 ownerRemainingBalance,
        uint256 beneficiaryRemainingBalance
    );

    event Withdraw(
        uint256 indexed streamID,
        address indexed owner,
        address indexed beneficiary,
        address recipient,
        uint256 amount
    );

    event Completed(uint256 indexed streamID);
}
