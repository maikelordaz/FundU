// SPDX-License-Identifier: MIT

/// @author Maikel Ordaz
/// @title FundU
pragma solidity 0.8.20;

import {UserWallet} from "./wallet/UserWallet.sol";

contract FundU is UserWallet {
    uint256 private s_streamId;

    // Streams
    mapping(uint256 => StreamData) private s_streamById; // Fund Id => Fund
    mapping(address => uint256[]) private s_beneficiaryStreamsIds; // address => [fund´s ids]
    mapping(address => uint256[]) private s_ownerStreamsIds; // address => [fund´s ids]

    /**
     * @notice To check the stream´s owner by giving the id
     */
    modifier onlyStreamOwner(uint256 id) {
        StreamData memory stream = s_streamById[id];
        require(msg.sender == stream.owner, "Stream: Only stream owner allowed");
        _;
    }

    /**
     * @notice To check the stream´s beneficiary by giving the id
     */
    modifier onlyStreamBeneficiary(uint256 id) {
        StreamData memory stream = s_streamById[id];
        require(msg.sender == stream.beneficiary, "Stream: Only stream beneficiary allowed");
        _;
    }

    constructor(
        address _feeManager,
        address _protocolManager,
        address _USDC,
        address _USDT
    ) UserWallet(_USDC, _USDT, _protocolManager, _feeManager) {
        s_streamId = 0;
    }

    receive() external payable {
        revert();
    }

    /*** MAIN FUNCTIONS ***/

    /**
     * @notice Create new streams
     * @param _beneficiary The one to receive the stream
     * @param _amountToDeposit How much to deposit
     * @param _start When the stream starts
     * @param _stop When the stream ends
     * @param _tokenAddress Tokens address deposited
     * @return The newly created stream´s id
     * @dev If start and stop are iqual it is an instant payment
     * @dev It fails if the beneficiary is the address zero
     * @dev It fails if the beneficiary is this contract
     * @dev It fails if the beneficiary is the owner
     * @dev It fails if there is no deposit
     * @dev It fails if the stopTime is less that the time when the function is called
     * @dev It fails if the transfer fails
     */
    function _newStream(
        address _beneficiary,
        uint256 _amountToDeposit,
        uint256 _start,
        uint256 _stop,
        address _tokenAddress
    ) internal nonReentrant returns (uint256) {
        require(
            _beneficiary != address(0x00) &&
                _beneficiary != address(this) &&
                _beneficiary != msg.sender,
            "Stream: Invalid beneficiary address"
        );
        require(_amountToDeposit != 0, "Stream: Zero amount");

        uint256 _depositPlusFees;

        _depositPlusFees = feeManager.mustHaveBalance(_amountToDeposit);
        require(
            s_userBalanceByToken[msg.sender][_tokenAddress] >= _depositPlusFees,
            "Stream: Not enough balance"
        );
        feeManager.collectFee(_amountToDeposit, _tokenAddress);

        uint256 _time = block.timestamp;
        uint256 _startTime;

        // If start is zero or less than the actual time the start time will be set to block.timestamp
        if (_start == 0 || _start < _time) {
            _startTime = _time;
        } else {
            _startTime = _start;
        }

        s_streamId++;

        StreamData storage stream = s_streamById[s_streamId];

        require(_stop >= _startTime, "Stream: Invalid stop time");

        if (_stop == _startTime) {
            // This will manage it like an instant payment
            stream.deposit = _amountToDeposit;
            stream.balanceLeft = 0;
            stream.startTime = _time;
            stream.stopTime = _time;
            stream.beneficiary = _beneficiary;
            stream.owner = msg.sender;
            stream.tokenAddress = _tokenAddress;
            stream.status = StreamStatus.Completed;

            // Transfer the balance directly to the beneficiary protocol´s wallet
            s_userBalanceByToken[_beneficiary][_tokenAddress] += _amountToDeposit;
        } else {
            // This will manage it like a stream
            uint256 _duration = _stop - _startTime;

            // This check is to ensure a rate per second, bigger than 0
            require(_amountToDeposit > _duration, "Stream: Deposit smaller than time left");

            stream.deposit = _amountToDeposit;
            stream.balanceLeft = _amountToDeposit;
            stream.startTime = _startTime;
            stream.stopTime = _stop;
            stream.beneficiary = _beneficiary;
            stream.owner = msg.sender;
            stream.tokenAddress = _tokenAddress;
            stream.status = StreamStatus.Active;
        }

        // The owner balance will be locked on streams and take away on instant payments

        s_userBalanceByToken[msg.sender][_tokenAddress] -= _depositPlusFees;

        s_beneficiaryStreamsIds[_beneficiary].push(s_streamId);
        s_ownerStreamsIds[msg.sender].push(s_streamId);

        StreamStatus status = stream.status;

        emit NewStream(
            s_streamId,
            msg.sender,
            _beneficiary,
            _amountToDeposit,
            _tokenAddress,
            _startTime,
            _stop,
            status
        );

        return s_streamId;
    }

    /**
     * @notice An internal function to manage withdraws on the Pause and Resume functions
     * @param _id The stream´s id
     * @param _who The one who receive the transfer
     * @dev _who can be the stream´s beneficiary or the stream´s owner
     */
    function _withdrawPauseAndResume(uint256 _id, address _who) private {
        StreamData storage stream = s_streamById[_id];

        uint256 _balance = 0;
        uint256 _time = block.timestamp;

        if (stream.stopTime <= _time) {
            _balance = stream.balanceLeft;
            stream.balanceLeft = 0;
            stream.status = StreamStatus.Completed;

            emit Completed(_id);
        } else {
            _balance = balanceOfStreamBeneficiary(_id);
            stream.balanceLeft = stream.balanceLeft - _balance;
        }

        if (_balance > 0) {
            s_userBalanceByToken[_who][stream.tokenAddress] += _balance;

            emit Withdraw(_id, stream.owner, stream.beneficiary, _who, _balance);
        }
    }

    /*** INSTANT PAYMENTS RELATED ***/
    /**
     * @notice Unique and instant payments
     * @param beneficiary The one to receive the payment
     * @param amountToDeposit How much to deposit
     * @param tokenAddress Tokens address deposited
     */
    function instantPayments(
        address beneficiary,
        uint256 amountToDeposit,
        address tokenAddress
    ) external {
        uint256 time = block.timestamp;
        _newStream(beneficiary, amountToDeposit, time, time, tokenAddress);
    }

    /**
     * @notice Multiple instant payments
     * @param beneficiaries Array of the ones to receive the payments
     * @param amountToDeposit How much to deposit
     * @param tokenAddress Tokens address deposited
     */
    function multipleInstantPayments(
        address[] memory beneficiaries,
        uint256 amountToDeposit,
        address tokenAddress
    ) external {
        uint256 time = block.timestamp;
        for (uint i = 0; i < beneficiaries.length; i++) {
            address beneficiary = beneficiaries[i];
            _newStream(beneficiary, amountToDeposit, time, time, tokenAddress);
        }
    }

    /*** STREAMS RELATED ***/

    /**
     * @notice Create new streams
     * @param beneficiary The one to receive the stream
     * @param amountToDeposit How much to deposit
     * @param start When the stream starts
     * @param stop When the stream ends
     * @param tokenAddress Tokens address deposited
     */
    function newStream(
        address beneficiary,
        uint256 amountToDeposit,
        uint256 start,
        uint256 stop,
        address tokenAddress
    ) external {
        _newStream(beneficiary, amountToDeposit, start, stop, tokenAddress);
    }

    /**
     * @notice Create multiple new streams
     * @param beneficiaries The one to receive the stream
     * @param amountToDeposit How much to deposit
     * @param start When the stream starts
     * @param stop When the stream ends
     * @param tokenAddress Tokens address deposited
     */
    function multipleNewStream(
        address[] memory beneficiaries,
        uint256 amountToDeposit,
        uint256 start,
        uint256 stop,
        address tokenAddress
    ) external {
        for (uint i = 0; i < beneficiaries.length; i++) {
            address beneficiary = beneficiaries[i];
            _newStream(beneficiary, amountToDeposit, start, stop, tokenAddress);
        }
    }

    /**
     * @notice Pause an active stream
     * @param id Stream´s id
     * @dev It fails if the caller is not the owner
     * @dev It fails if the stream is not active
     */
    function pause(uint256 id) external onlyStreamOwner(id) {
        StreamData storage stream = s_streamById[id];

        require(stream.status == StreamStatus.Active, "Stream: Stream incorrect status");

        stream.status = StreamStatus.Paused;

        _withdrawPauseAndResume(id, stream.beneficiary);

        emit PauseStream(id, stream.owner, stream.beneficiary);
    }

    /**
     * @notice Resume a paused stream
     * @param id Stream´s id
     * @param paid True if it is a paid pause, false if not
     * @dev It fails if the caller is not the owner
     * @dev It fails if the stream is not active
     */
    function resumeStream(uint256 id, bool paid) public onlyStreamOwner(id) {
        StreamData storage stream = s_streamById[id];

        require(stream.status == StreamStatus.Paused, "Stream: Stream incorrect status");

        if (!paid) {
            _withdrawPauseAndResume(id, stream.owner);
        }

        if (stream.status != StreamStatus.Completed) {
            stream.status = StreamStatus.Active;

            emit ResumeStream(id, stream.owner, stream.beneficiary, paid);
        }
    }

    /**
     * @notice Cancel an existing stream
     * @param id Stream´s id
     * @dev If the beneficiary has some unclaimed balance, it will be transfer to him
     * The rest of the balance on the stream will be transfer to the owner
     * @dev It fails if the stream doesn´t exist
     * @dev It fails if the caller is not the owner
     * @dev It fails if the transfer fails
     */
    function cancelStream(uint256 id) external nonReentrant onlyStreamOwner(id) {
        StreamData storage stream = s_streamById[id];

        require(
            stream.status == StreamStatus.Active || stream.status == StreamStatus.Paused,
            "Stream: Stream incorrect status"
        );

        if (stream.status == StreamStatus.Paused) {
            resumeStream(id, false);
        }

        // Check the balances
        uint256 ownerRemainingBalance = balanceOfStreamOwner(id);
        uint256 beneficiaryRemainingBalance = balanceOfStreamBeneficiary(id);

        stream.status = StreamStatus.Canceled;
        stream.balanceLeft = 0;

        if (beneficiaryRemainingBalance > 0) {
            s_userBalanceByToken[stream.beneficiary][
                stream.tokenAddress
            ] += beneficiaryRemainingBalance;
        }
        if (ownerRemainingBalance > 0) {
            s_userBalanceByToken[stream.owner][stream.tokenAddress] += ownerRemainingBalance;
        }

        emit CancelStream(
            id,
            stream.owner,
            stream.beneficiary,
            ownerRemainingBalance,
            beneficiaryRemainingBalance
        );
    }

    /**
     * @notice Allow the beneficiary to withdraw the proceeds
     * @dev It fails if the stream doesn´t exist
     * @dev It fails if the caller is not the beneficiary
     * @dev It fails if the amount is bigger than the balance left
     * @dev It fails if the transfer fails
     */
    function withdrawAll() external nonReentrant {
        uint256[] memory beneficiaryIds = s_beneficiaryStreamsIds[msg.sender];
        for (uint i = 0; i < beneficiaryIds.length; i++) {
            uint256 id = beneficiaryIds[i];
            StreamData memory stream = s_streamById[id];

            if (stream.status == StreamStatus.Active) {
                _withdrawPauseAndResume(id, stream.beneficiary);
            }
        }
    }

    /**
     * @notice Allow the beneficiary to withdraw the proceeds
     * @param id Stream´s id
     * @dev It fails if the stream doesn´t exist
     * @dev It fails if the caller is not the beneficiary
     * @dev It fails if the amount is bigger than the balance left
     * @dev It fails if the transfer fails
     */
    function withdraw(uint256 id) public nonReentrant onlyStreamBeneficiary(id) {
        StreamData storage stream = s_streamById[id];

        require(stream.status == StreamStatus.Active, "Stream: Stream incorrect status");

        uint256 balance = 0;

        uint256 time = block.timestamp;

        if (stream.stopTime <= time) {
            balance = stream.balanceLeft;
            stream.balanceLeft = 0;
            stream.status = StreamStatus.Completed;

            emit Completed(id);
        } else {
            balance = balanceOfStreamBeneficiary(id);

            require(balance > 0, "Stream: No balance available");

            stream.balanceLeft = stream.balanceLeft - balance;
        }

        s_userBalanceByToken[stream.beneficiary][stream.tokenAddress] += balance;

        emit Withdraw(id, stream.owner, stream.beneficiary, stream.beneficiary, balance);
    }

    /*** VIEW / PURE FUNCTIONS ***/

    /*** STREAM´S INFO ***/
    /**
     * @notice Get the total number of streams
     */
    function getStreamsNumber() public view returns (uint256) {
        return s_streamId;
    }

    /**
     * @notice Get the Stream by giving the id
     * @return StreamData object
     */
    function getStreamById(uint256 id) public view returns (StreamData memory) {
        return s_streamById[id];
    }

    /*** STREAM BENEFICIARY´S INFO ***/
    /**
     * @notice Get all beneficiary streams
     * @return StreamData object
     */
    function getStreamByBeneficiary(address beneficiary) public view returns (uint256[] memory) {
        return s_beneficiaryStreamsIds[beneficiary];
    }

    /**
     * @notice Get a beneficiary´s total Streams
     * @return StreamData object
     */
    function getBeneficiaryStreamCount(address beneficiary) public view returns (uint256) {
        return s_beneficiaryStreamsIds[beneficiary].length;
    }

    /*** STREAM OWNER´S INFO ***/
    /**
     * @notice Get all owner streams
     * @return StreamData object
     */
    function getStreamByOwner(address owner) public view returns (uint256[] memory) {
        return s_ownerStreamsIds[owner];
    }

    /**
     * @notice Get a owner´s total Streams
     * @return StreamData object
     */
    function getOwnerStreamCount(address owner) public view returns (uint256) {
        return s_ownerStreamsIds[owner].length;
    }

    /*** AUXILIARS ***/

    function amountNeeded(uint256 toDeposit) public view returns (uint256) {
        uint256 needed;

        uint inputFromUser = toDeposit * 10 ** 6;
        needed = (feeManager.mustHaveBalance(inputFromUser));

        return needed;
    }

    /**
     * @notice Calculate the unclaimed balance of a stream´s beneficiary by giving the id
     * @return balance of beneficiary
     */
    function balanceOfStreamBeneficiary(uint256 id) public view returns (uint256 balance) {
        StreamData memory stream = s_streamById[id];

        uint256 time = timePassed(id);
        uint256 duration = stream.stopTime - stream.startTime;
        uint256 rate = stream.deposit / duration;
        uint256 beneficiaryBalance = time * rate;

        // If the deposit is bigger than balanceLeft there has been some withdraws
        if (stream.deposit > stream.balanceLeft) {
            // So check how much the beneficiary has withdraw and calculate the actual balance
            uint256 withdraws = stream.deposit - stream.balanceLeft;
            beneficiaryBalance = beneficiaryBalance - withdraws;
        }

        return beneficiaryBalance;
    }

    /**
     * @notice Calculate the balance of the stream´s owner by giving the id
     * @param id Stream´s id
     * @return balance of owner
     */
    function balanceOfStreamOwner(uint256 id) public view returns (uint256 balance) {
        StreamData memory stream = s_streamById[id];
        uint256 beneficiaryBalance = balanceOfStreamBeneficiary(id);

        uint256 ownerBalance = stream.balanceLeft - beneficiaryBalance;
        return ownerBalance;
    }

    /**
     * @notice Calculates the stram´s time passed by giving the id
     * @return time passed
     */
    function timePassed(uint256 id) public view returns (uint256 time) {
        StreamData memory stream = s_streamById[id];
        uint256 currentTime = block.timestamp;
        if (currentTime <= stream.startTime) return 0;
        if (currentTime < stream.stopTime) return currentTime - stream.startTime;
        return stream.stopTime - stream.startTime;
    }
}
