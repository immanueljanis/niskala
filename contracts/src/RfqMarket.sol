// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IHonkVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}

/// @title Niskala RfqMarket - sealed RFQ rounds with ZK-verified best execution.
/// @notice One market: the trader BUYs `amountOut` of the base token and pays USDC at the proven best priceE6.
///         Market makers pre-deposit the base token here; a commitment locks exactly `amountOut`.
///         A round closes automatically at MAX_SLOTS commitments, or at the deadline with at least MIN_SLOTS.
///         Losing quotes never touch the chain. Only the proven winner's price is recorded.
contract RfqMarket {
    uint8 public constant MAX_SLOTS = 5;
    uint8 public constant MIN_SLOTS = 3;
    uint256 public constant BASE_UNIT = 1e18;

    enum Status {
        NONE,
        OPEN,
        COMMIT_CLOSED,
        PROVEN,
        SETTLED,
        CANCELLED
    }

    struct Rfq {
        address trader;
        uint256 amountOut;
        uint64 commitDeadline;
        uint64 settleDeadline;
        Status status;
        uint8 commitmentCount;
        uint8 winnerIndex;
        uint64 winningPriceE6;
        address[5] makers;
        bytes32[5] commitments;
        bytes32 proofHash;
        uint256 usdcPaid;
    }

    IERC20 public immutable usdc;
    IERC20 public immutable weth;
    IHonkVerifier public immutable verifier;
    /// @dev (chainId << 160) | address(this). Bound into every commitment and every proof.
    uint256 public immutable DOMAIN;
    address public immutable owner;

    uint256 public rfqCount;
    mapping(uint256 => Rfq) internal rfqs;
    mapping(address => bool) public isMaker;
    address[] public makerRoster;
    mapping(address => uint256) public deposited;
    mapping(address => uint256) public locked;
    mapping(uint256 => mapping(address => bool)) public hasCommitted;

    event MakerRegistered(address indexed maker);
    event Deposited(address indexed maker, uint256 amount);
    event Withdrawn(address indexed maker, uint256 amount);
    event RfqCreated(uint256 indexed rfqId, address indexed trader, uint256 amountOut, uint64 commitDeadline, uint64 settleDeadline);
    event QuoteCommitted(uint256 indexed rfqId, address indexed maker, uint8 slot, bytes32 commitment);
    event CommitPhaseClosed(uint256 indexed rfqId, uint8 commitmentCount);
    event BestExecutionProven(uint256 indexed rfqId, uint8 winnerIndex, address indexed winner, uint64 winningPriceE6, bytes32 proofHash);
    event RfqSettled(uint256 indexed rfqId, address indexed trader, address indexed winner, uint256 amountOut, uint256 usdcPaid);
    event RfqCancelled(uint256 indexed rfqId, Status fromStatus);

    error NotOwner();
    error NotMaker();
    error BadStatus(Status actual);
    error Deadline();
    error AlreadyCommitted();
    error InsufficientVault();
    error InvalidProof();
    error BadWinner();
    error NotTrader();
    error PaymentFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyMaker() {
        if (!isMaker[msg.sender]) revert NotMaker();
        _;
    }

    constructor(IERC20 _usdc, IERC20 _weth, IHonkVerifier _verifier, address[] memory initialMakers) {
        usdc = _usdc;
        weth = _weth;
        verifier = _verifier;
        owner = msg.sender;
        DOMAIN = (block.chainid << 160) | uint256(uint160(address(this)));
        for (uint256 i = 0; i < initialMakers.length; i++) _registerMaker(initialMakers[i]);
    }

    /* ----------------------------- maker registry + vault ----------------------------- */

    function registerMaker(address maker) external onlyOwner {
        _registerMaker(maker);
    }

    function _registerMaker(address maker) internal {
        if (isMaker[maker]) return;
        isMaker[maker] = true;
        makerRoster.push(maker);
        emit MakerRegistered(maker);
    }

    function makers() external view returns (address[] memory) {
        return makerRoster;
    }

    function available(address maker) public view returns (uint256) {
        return deposited[maker] - locked[maker];
    }

    function deposit(uint256 amount) external onlyMaker {
        require(weth.transferFrom(msg.sender, address(this), amount), "base in");
        deposited[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        if (available(msg.sender) < amount) revert InsufficientVault();
        deposited[msg.sender] -= amount;
        require(weth.transfer(msg.sender, amount), "base out");
        emit Withdrawn(msg.sender, amount);
    }

    /* --------------------------------- RFQ lifecycle --------------------------------- */

    function createRfq(uint256 amountOut, uint64 commitWindow, uint64 settleWindow) external returns (uint256 rfqId) {
        require(amountOut > 0, "amount");
        require(commitWindow > 0 && settleWindow > 0, "windows");
        rfqId = ++rfqCount;
        Rfq storage r = rfqs[rfqId];
        r.trader = msg.sender;
        r.amountOut = amountOut;
        r.commitDeadline = uint64(block.timestamp) + commitWindow;
        r.settleDeadline = r.commitDeadline + settleWindow;
        r.status = Status.OPEN;
        emit RfqCreated(rfqId, msg.sender, amountOut, r.commitDeadline, r.settleDeadline);
    }

    /// @notice A registered maker seals a quote. The commitment preimage never touches the chain.
    function commit(uint256 rfqId, bytes32 commitment) external onlyMaker {
        Rfq storage r = rfqs[rfqId];
        if (r.status != Status.OPEN) revert BadStatus(r.status);
        if (block.timestamp > r.commitDeadline) revert Deadline();
        if (hasCommitted[rfqId][msg.sender]) revert AlreadyCommitted();
        if (available(msg.sender) < r.amountOut) revert InsufficientVault();

        uint8 slot = r.commitmentCount;
        r.makers[slot] = msg.sender;
        r.commitments[slot] = commitment;
        r.commitmentCount = slot + 1;
        hasCommitted[rfqId][msg.sender] = true;
        locked[msg.sender] += r.amountOut;
        emit QuoteCommitted(rfqId, msg.sender, slot, commitment);

        if (r.commitmentCount == MAX_SLOTS) {
            r.status = Status.COMMIT_CLOSED;
            emit CommitPhaseClosed(rfqId, MAX_SLOTS);
        }
    }

    /// @notice After the commit deadline: close with at least MIN_SLOTS commitments, or cancel and unlock.
    function closeCommit(uint256 rfqId) external {
        Rfq storage r = rfqs[rfqId];
        if (r.status != Status.OPEN) revert BadStatus(r.status);
        if (block.timestamp <= r.commitDeadline) revert Deadline();
        if (r.commitmentCount >= MIN_SLOTS) {
            r.status = Status.COMMIT_CLOSED;
            emit CommitPhaseClosed(rfqId, r.commitmentCount);
        } else {
            _cancel(rfqId, r);
        }
    }

    /// @notice Permissionless: anyone holding a valid proof may record the winner.
    ///         Public inputs are rebuilt from storage, so a proof binds to exactly this RFQ,
    ///         this chain, this market, and this exact commitment set (including its size).
    function submitProof(uint256 rfqId, uint8 winnerIndex, uint64 winningPriceE6, bytes calldata proof) external {
        Rfq storage r = rfqs[rfqId];
        if (r.status != Status.COMMIT_CLOSED) revert BadStatus(r.status);
        if (block.timestamp > r.settleDeadline) revert Deadline();
        if (winnerIndex >= r.commitmentCount || winningPriceE6 == 0) revert BadWinner();
        if (!verifier.verify(proof, publicInputs(rfqId, winnerIndex, winningPriceE6))) revert InvalidProof();

        r.status = Status.PROVEN;
        r.winnerIndex = winnerIndex;
        r.winningPriceE6 = winningPriceE6;
        r.proofHash = keccak256(proof);
        emit BestExecutionProven(rfqId, winnerIndex, r.makers[winnerIndex], winningPriceE6, r.proofHash);
    }

    /// @notice Trader settles at the proven price: USDC to winner, base token to trader, losers unlocked.
    function execute(uint256 rfqId) external {
        Rfq storage r = rfqs[rfqId];
        if (r.status != Status.PROVEN) revert BadStatus(r.status);
        if (msg.sender != r.trader) revert NotTrader();
        if (block.timestamp > r.settleDeadline) revert Deadline();

        address winner = r.makers[r.winnerIndex];
        uint256 cost = quoteCost(r.amountOut, r.winningPriceE6);
        r.status = Status.SETTLED;
        r.usdcPaid = cost;
        _unlockAll(r);
        deposited[winner] -= r.amountOut;
        if (!usdc.transferFrom(msg.sender, winner, cost)) revert PaymentFailed();
        require(weth.transfer(msg.sender, r.amountOut), "base out");
        emit RfqSettled(rfqId, msg.sender, winner, r.amountOut, cost);
    }

    /// @notice After the settle deadline, an unproven or unexecuted round is cancelled and unlocked.
    function expire(uint256 rfqId) external {
        Rfq storage r = rfqs[rfqId];
        if (r.status != Status.COMMIT_CLOSED && r.status != Status.PROVEN) revert BadStatus(r.status);
        if (block.timestamp <= r.settleDeadline) revert Deadline();
        _cancel(rfqId, r);
    }

    function _cancel(uint256 rfqId, Rfq storage r) internal {
        Status from = r.status;
        r.status = Status.CANCELLED;
        _unlockAll(r);
        emit RfqCancelled(rfqId, from);
    }

    function _unlockAll(Rfq storage r) internal {
        for (uint8 i = 0; i < r.commitmentCount; i++) locked[r.makers[i]] -= r.amountOut;
    }

    /* -------------------------------------- views ------------------------------------- */

    function getRfq(uint256 rfqId) external view returns (Rfq memory) {
        return rfqs[rfqId];
    }

    /// @dev USDC (6 dec) owed for `amountOut` base units (18 dec) at `priceE6` USDC per unit.
    function quoteCost(uint256 amountOut, uint64 priceE6) public pure returns (uint256) {
        return (amountOut * priceE6) / BASE_UNIT;
    }

    /// @dev Must match circuits/best_quote `main` public-input order:
    ///      [domain, rfq_id, makers[MAX_SLOTS], commitments[MAX_SLOTS], count, winner_index, winning_price]
    function publicInputs(uint256 rfqId, uint8 winnerIndex, uint64 winningPriceE6) public view returns (bytes32[] memory inputs) {
        Rfq storage r = rfqs[rfqId];
        inputs = new bytes32[](2 + MAX_SLOTS * 2 + 3);
        inputs[0] = bytes32(DOMAIN);
        inputs[1] = bytes32(rfqId);
        for (uint256 i = 0; i < MAX_SLOTS; i++) {
            inputs[2 + i] = bytes32(uint256(uint160(r.makers[i])));
            inputs[2 + MAX_SLOTS + i] = r.commitments[i];
        }
        inputs[2 + MAX_SLOTS * 2] = bytes32(uint256(r.commitmentCount));
        inputs[3 + MAX_SLOTS * 2] = bytes32(uint256(winnerIndex));
        inputs[4 + MAX_SLOTS * 2] = bytes32(uint256(winningPriceE6));
    }
}
