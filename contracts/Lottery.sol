// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

///////////////
//  Imports  //
///////////////
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";
import "hardhat/console.sol";

//////////////
//  Errors  //
//////////////
error Lottery__AlreadyStarted();
error Lottery__NotOpen();
error Lottery__NotEnoughFeeSent();
error Lottery__TransferFailed();
error Lottery__UpkeepNotNeeded();

////////////////////
// Smart Contract //
////////////////////

/**
 * @title Decentralized Lottery contract
 * @author Dariusz Setlak
 * @notice The Decentralized Lottery smart contract.
 * @dev The Decentralized Lottery smart contract containing the following functions:
 * Main functions:
 * Getter functions:
 * Other functions: receive, fallback
 */
contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {
    //////////////
    //  Events  //
    //////////////
    event LotteryStarted(LotteryDuration indexed duration, LotteryFee indexed entranceFee, address indexed firstPlayer);
    event LotteryJoined(address indexed newPlayer);
    event LotteryWinnerRequested(uint256 indexed requestId);
    event WinnerPicked(address indexed winner, uint256 indexed winnerPrize);
    event NewTransferReceived(uint256 amount);

    //////////////
    //   Enums  //
    //////////////

    /**
     * @dev Enum variable storing 3 possible lottery states: 0 - CLOSE, 1 - OPEN, 2 - CALCULATING
     * CLOSE - lottery in not started state, first player which join the lottery also OPEN it
     * OPEN - lottery is in open state, first player who join the lottery OPEN it and choose the entrance fee
     * CALCULATING - lottery is choosing the winner, not possible to join lottery
     */
    enum LotteryState {
        CLOSE, // 0
        OPEN, // 1
        CALCULATING // 2
    }

    /**
     * @dev Enum variable storing 3 possible lottery duration times:
     * FAST - 5 minutes
     * MEDIUM - 1 hour
     * LONG - 12 hours
     */
    enum LotteryDuration {
        FAST, // 0
        MEDIUM, // 1
        LONG // 2
    }

    /**
     * @dev Enum variable storing 3 possible lottery entrance fee values:
     * LOW - 0.1
     * MEDIUM - 1
     * HIGH - 10
     */
    enum LotteryFee {
        LOW, // 0
        MEDIUM, // 1
        HIGH // 2
    }

    ///////////////
    //  Scructs  //
    ///////////////

    /**
     * @dev Struct of lottery data parameters.
     * LotteryState lotteryState - lottery state ENUM parameter
     * uint256 lotteryFee - lottery fee parameter
     * uint256 startTimeStamp - lottery start time stamp parameter
     * uint256 duration - lottery duration time in seconds
     * LotteryPlayers[] players - array of lottery players addresses
     * LatestLotteryData latestLotteryData - latest lottery data parameters
     */
    struct LotteryData {
        LotteryState lotteryState;
        uint256 lotteryFee;
        uint256 startTimeStamp;
        uint256 duration;
        address payable[] players;
        address latestLotteryWinner;
    }

    ////////////////
    //  Mappings  //
    ////////////////

    /// @dev Mapping LotteryDuration to lottery duration constant values.
    mapping(LotteryDuration => uint256) private s_lotteryDurations;

    /// @dev Mapping LotteryFee to lottery entrance fee constant values.
    mapping(LotteryFee => uint256) private s_lotteryFees;

    ///////////////////////
    // Lottery variables //
    ///////////////////////

    /// @dev Lottery data parameters struct variable
    LotteryData private s_lotteryData;

    /// @dev Lottery duration FAST value
    uint256 public constant DURATION_5MINUTES = 300; // 300 seconds = 5 minutes

    /// @dev Lottery duration MEDIUM value
    uint256 public constant DURATION_1HOUR = 3600; // 3600 seconds = 60 minutes = 1 hour

    /// @dev Lottery duration LONG value
    uint256 public constant DURATION_1DAY = 86400; // 86400 seconds = 1440 minutes = 24 hours

    /// @dev Lottery entrance fee LOW value
    uint256 public constant FEE_LOW = 100000000000000000; // 0.1 ETH

    /// @dev Lottery entrance fee MEDIUM value
    uint256 public constant FEE_MEDIUM = 1000000000000000000; // 1 ETH

    /// @dev Lottery entrance fee HIGH value
    uint256 public constant FEE_HIGH = 10000000000000000000; // 10 ETH

    ///////////////////
    // VRF variables //
    ///////////////////

    /// @dev The VRFCoordinatorV2 contract.
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

    /// @dev The gas lane key hash value is the maximum gas price you want to pay for a single VRF request in wei.
    bytes32 private immutable i_gasLane;

    /// @dev The subscription ID that this contract uses for funding VRF requests.
    uint32 private immutable i_subscriptionId;

    /// @dev The limit for how much gas to use for the callback request to fulfillRandomWords() contract function.
    /// This variable set the limit of computation of fulfillRandomWords() function.
    uint32 private immutable i_callbackGasLimit;

    /// @dev The number of confirmations that Chainlink node should wait before responding.
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    /// @dev The number of random values requested to VRFCoordinatorV2 contract.
    uint32 private constant NUM_WORDS = 1;

    ///////////////////
    //  Constructor  //
    ///////////////////

    /**
     * @dev Lottery contract constructor.
     * Set given parameters to appropriate variables, when contract deploys.
     * @param vrfCoordinatorV2 given vrfCoordinatorV2 contract
     * @param gasLane given gas lane key hash value
     * @param subscriptionId given Chainlink VRF subscriptionId number
     * @param callbackGasLimit given limit of gas for a single Chainlink VRF request
     */
    constructor(
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint32 subscriptionId,
        uint32 callbackGasLimit
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        s_lotteryData.lotteryState = LotteryState.CLOSE;

        s_lotteryFees[LotteryFee.LOW] = FEE_LOW;
        s_lotteryFees[LotteryFee.MEDIUM] = FEE_MEDIUM;
        s_lotteryFees[LotteryFee.HIGH] = FEE_HIGH;

        s_lotteryDurations[LotteryDuration.FAST] = DURATION_5MINUTES;
        s_lotteryDurations[LotteryDuration.MEDIUM] = DURATION_1HOUR;
        s_lotteryDurations[LotteryDuration.LONG] = DURATION_1DAY;

        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
    }

    ////////////////////
    // Main Functions //
    ////////////////////

    /**
     * @notice Function for start new decentralized lottery.
     * @dev Function allows player to start new decentralized lottery.
     * First player, who starts new lottery set the lottery parameters:
     * -> lottery duration time: FAST - 5 minutes, MEDIUM - 1 hour and LONG - 1 day
     * -> lottery entrance fee: LOW - 0.1, MEDIUM - 1 and HIGH - 10.
     * 
     * This is a public function, invoked by the user, using front-end application.

     * @param _duration lottery duration time of first player choice (ENUM)
     * @param _entranceFee lottery entrance fee of choice (ENUM)
     */
    function startLottery(LotteryDuration _duration, LotteryFee _entranceFee) public payable {
        // Check if lottery is in CLOSE state
        if (s_lotteryData.lotteryState != LotteryState.CLOSE) {
            revert Lottery__AlreadyStarted();
        }

        // Set lottery entrance fee
        if (_entranceFee == LotteryFee.LOW) s_lotteryData.lotteryFee = s_lotteryFees[LotteryFee.LOW];
        else if (_entranceFee == LotteryFee.MEDIUM) s_lotteryData.lotteryFee = s_lotteryFees[LotteryFee.MEDIUM];
        else if (_entranceFee == LotteryFee.HIGH) s_lotteryData.lotteryFee = s_lotteryFees[LotteryFee.HIGH];

        // Check if first player enough entrance fee with transaction
        if (msg.value < s_lotteryFees[_entranceFee]) {
            revert Lottery__NotEnoughFeeSent();
        }

        // Set lottery duration time
        if (_duration == LotteryDuration.FAST) s_lotteryData.duration = s_lotteryDurations[LotteryDuration.FAST];
        else if (_duration == LotteryDuration.MEDIUM) s_lotteryData.duration = s_lotteryDurations[LotteryDuration.MEDIUM];
        else if (_duration == LotteryDuration.LONG) s_lotteryData.duration = s_lotteryDurations[LotteryDuration.LONG];
        // Change lottery state to OPEN
        s_lotteryData.lotteryState = LotteryState.OPEN;

        // Push first lottery player's address to array
        s_lotteryData.players.push(payable(msg.sender));

        // Set lottery starting time stamp
        s_lotteryData.startTimeStamp = block.timestamp;

        // Emit an event LotteryStarted
        emit LotteryStarted(_duration, _entranceFee, msg.sender);
    }

    /**
     * @notice Function for joining new players to already started lottery.
     * @dev Function allows new players to join already started lottery.
     * To join already started lottery, new player has to send entrance fee with transaction.
     * The entrance fee amount is fixed and set by the player, who has started this specific lottery.
     * The lottery entrance fee can not be changed until lottery duration time expires and the winner
     * is picked. If that happens, the lottery can be started again by first player with new duration
     * time and entrance fee using `startLottery` function.
     *
     * This is a public function, invoked by the user, using front-end application.
     */
    function joinLottery() public payable {
        // Check if lottery is in OPEN state
        if (s_lotteryData.lotteryState != LotteryState.OPEN) {
            revert Lottery__NotOpen();
        }

        // Check if new player enough entrance fee with transaction
        if (msg.value < s_lotteryData.lotteryFee) {
            revert Lottery__NotEnoughFeeSent();
        }

        // Push new lottery player's address to array
        s_lotteryData.players.push(payable(msg.sender));

        // Emit an event LotteryStarted
        emit LotteryJoined(msg.sender);
    }

    /**
     * @notice Chainlink Automation function for checking if upKeep action is needed.
     * @dev Public and overriden Chainlink Automation function for checking the conditions,
     * which have to be passed to perform upKeep action.
     * The following conditions should be true in order to return true value of `upkeepNeeded`:
     * 1. The lottery should be in an OPEN state
     * 2. The Lottery duration time should have passed
     * 3. The lottery should have at lease 1 player
     * 3. The lottery balance should be > 0
     * 3. Chainlink Automation subscription should be funded with LINK
     *
     * This is a public function, invoked by Chainlink Automation node.
     *
     * @return upkeepNeeded the upkeepNeeded bool variable
     */
    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isLotteryOpen = s_lotteryData.lotteryState == LotteryState.OPEN;
        // bool lotteryTimePassed = (block.timestamp - s_lotteryData.startTimeStamp) > s_lotteryData.duration;
        bool lotteryHasPlayers = s_lotteryData.players.length > 0;
        bool lotteryHasBalance = address(this).balance > 0;

        if (
            isLotteryOpen &&
            /*lotteryTimePassed &&*/
            lotteryHasPlayers &&
            lotteryHasBalance
        ) return (upkeepNeeded = true, "");
        else return (upkeepNeeded = false, "");
    }

    /**
     * @notice Chainlink Automation function for performing upKeep action.
     * @dev External and overriden Chainlink Automation function for performing upKeep action.
     *
     * This is an external function, invoked by Chainlink Automation node.
     *
     */
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        // Check if upKeep action is needed
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lottery__UpkeepNotNeeded();
        }

        // Set lottery state to CALCULATING
        s_lotteryData.lotteryState = LotteryState.CALCULATING;

        // Perform upKeep action: Chainlink VRF requestRandomWords function
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        // Emit an event LotteryWinnerRequested
        emit LotteryWinnerRequested(requestId);
    }

    /**
     * @notice Chainlink VRF function for random pick the lottery winner.
     * @dev Intenal and overriden Chainlink VRF function for random pick the lottery winner.
     *
     * This is an internal function, invoked by Chainlink Automation node.
     *
     * @param _randomNumbers random numbers array from Chainlink VRF
     */
    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory _randomNumbers
    ) internal override {
        // Pick the lottery winner
        uint256 indexOfWinner = _randomNumbers[0] % s_lotteryData.players.length;
        address payable currentWinner = s_lotteryData.players[indexOfWinner];

        // Set current winner address as latest lottery winner
        s_lotteryData.latestLotteryWinner = currentWinner;

        // Set the lottery state to CLOSE
        s_lotteryData.lotteryState = LotteryState.CLOSE;

        // Reset the lottery participants addresses array
        s_lotteryData.players = new address payable[](0);

        // Transfer lottery funds to the lottery winner
        uint256 lotteryBalance = address(this).balance;
        (bool success, ) = currentWinner.call{value: lotteryBalance}("");
        if (!success) {
            revert Lottery__TransferFailed();
        }

        // Emit an event WinnerPicked
        emit WinnerPicked(currentWinner, lotteryBalance);
    }

    //////////////////////
    // Getter Functions //
    //////////////////////

    /**
     * @notice Getter function to get the current lottery state: 0 - NOT_STARTED, 1 - OPEN, 2 - CALCULATING
     * @return The lottery state ENUM variable.
     */
    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryData.lotteryState;
    }

    /**
     * @notice Getter function to get the current lottery entrance fee.
     * @return The lottery entrance fee.
     */
    function getLotteryEntranceFee() public view returns (uint256) {
        return s_lotteryData.lotteryFee;
    }

    /**
     * @notice Getter function to get the current lottery balance.
     * @return The lottery balance.
     */
    function getLotteryBalance() public view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Getter function to get the current lottery starting time stamp.
     * @return The lottery starting time stamp.
     */
    function getLotteryStartTimeStamp() public view returns (uint256) {
        return s_lotteryData.startTimeStamp;
    }

    /**
     * @notice Getter function to get the current lottery duration time.
     * @return The lottery duration time in seconds
     */
    function getLotteryDurationTime() public view returns (uint256) {
        return s_lotteryData.duration;
    }

    /**
     * @notice Getter function to get the number of current lottery players.
     * @return The number of lottery players.
     */
    function getLotteryPlayersNumber() public view returns (uint256) {
        return s_lotteryData.players.length;
    }

    /**
     * @notice Getter function to get the latest lottery winner address.
     * @return The latest lottery winner address.
     */
    function getLatestLotteryWinner() public view returns (address) {
        return s_lotteryData.latestLotteryWinner;
    }

    /**
     * @notice Getter function to get the lottery durations times: 0 - FAST, 1 - MEDIUM, 2 - LONG
     * @param _duration the LotteryDuration ENUM input parameter
     * @return The lottery duration time of chosen ENUM value.
     */
    function getLotteryDurationsTimes(LotteryDuration _duration) public view returns (uint256) {
        return s_lotteryDurations[_duration];
    }

    /**
     * @notice Getter function to get the lottery durations times: 0 - LOW, 1 - MEDIUM, 2 - HIGH
     * @param _entranceFee the LotteryFee ENUM input parameter
     * @return The lottery duration time of chosen ENUM value.
     */
    function geLotteryFeesAmount(LotteryFee _entranceFee) public view returns (uint256) {
        return s_lotteryFees[_entranceFee];
    }

    /////////////////////
    // Other Functions //
    /////////////////////

    /**
     * @notice Receive funds
     * @dev Function allows to receive funds sent to smart contract.
     */
    receive() external payable {
        // console.log("Function `receive` invoked");
        emit NewTransferReceived(msg.value);
    }

    /**
     * @notice Fallback function
     * @dev Function executes if none of the contract functions (function selector) match the intended
     * function calls.
     */
    fallback() external payable {
        // console.log("Function `fallback` invoked");
        emit NewTransferReceived(msg.value);
    }
}
