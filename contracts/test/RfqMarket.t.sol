// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {RfqMarket, IERC20, IHonkVerifier} from "../src/RfqMarket.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";

/// @dev World mirrored by packages/zk/scripts/fixtures.ts. Proofs are real UltraHonk proofs
///      generated offchain against this exact chainId / market address / maker set.
contract RfqMarketTest is Test {
    struct Fixture {
        address market;
        bytes32 domain;
        uint256 rfqId;
        uint256 amountOut;
        uint256 count;
        bytes32[] commitments;
        uint8 winnerIndex;
        uint64 winningPriceE6;
        bytes proof;
    }

    address constant MARKET_DEPLOYER = 0x1111111111111111111111111111111111111111;
    address constant TRADER = address(0xF6);
    address[5] MAKERS = [address(0xA1), address(0xB2), address(0xC3), address(0xD4), address(0xE5)];
    uint256 constant AMOUNT_OUT = 10 ether;
    uint64 constant COMMIT_WINDOW = 120;
    uint64 constant SETTLE_WINDOW = 600;

    MockERC20 usdc;
    MockERC20 weth;
    HonkVerifier verifier;
    RfqMarket market;

    function setUp() public {
        vm.chainId(31337);
        usdc = new MockERC20("Mock USDC", "USDC", 6);
        weth = new MockERC20("Mock WETH", "WETH", 18);
        verifier = new HonkVerifier();
        address[] memory roster = new address[](5);
        for (uint256 i = 0; i < 5; i++) roster[i] = MAKERS[i];
        vm.prank(MARKET_DEPLOYER);
        market = new RfqMarket(IERC20(address(usdc)), IERC20(address(weth)), IHonkVerifier(address(verifier)), roster);

        for (uint256 i = 0; i < 5; i++) {
            weth.mint(MAKERS[i], 100 ether);
            vm.startPrank(MAKERS[i]);
            weth.approve(address(market), type(uint256).max);
            market.deposit(100 ether);
            vm.stopPrank();
        }
        usdc.mint(TRADER, 1_000_000e6);
        vm.prank(TRADER);
        usdc.approve(address(market), type(uint256).max);
    }

    function _fixture(string memory name) internal view returns (Fixture memory f) {
        string memory json = vm.readFile(string.concat("test/fixtures/", name, ".json"));
        f.market = vm.parseJsonAddress(json, ".market");
        f.domain = vm.parseJsonBytes32(json, ".domain");
        f.rfqId = vm.parseJsonUint(json, ".rfqId");
        f.amountOut = vm.parseJsonUint(json, ".amountOut");
        f.count = vm.parseJsonUint(json, ".count");
        f.commitments = vm.parseJsonBytes32Array(json, ".commitments");
        f.winnerIndex = uint8(vm.parseJsonUint(json, ".winnerIndex"));
        f.winningPriceE6 = uint64(vm.parseJsonUint(json, ".winningPriceE6"));
        f.proof = vm.parseJsonBytes(json, ".proof");
        assertEq(f.market, address(market), "fixture market address must match deployed market");
        assertEq(f.domain, bytes32(market.DOMAIN()), "fixture domain must match market DOMAIN");
    }

    function _createRfq() internal returns (uint256 rfqId) {
        vm.prank(TRADER);
        rfqId = market.createRfq(AMOUNT_OUT, COMMIT_WINDOW, SETTLE_WINDOW);
    }

    function _commit(uint256 rfqId, bytes32[] memory commitments) internal {
        for (uint256 i = 0; i < commitments.length; i++) {
            vm.prank(MAKERS[i]);
            market.commit(rfqId, commitments[i]);
        }
    }

    /// @dev Full rounds close at MAX_SLOTS; partial rounds close at the deadline.
    function _commitAndClose(uint256 rfqId, bytes32[] memory commitments) internal {
        _commit(rfqId, commitments);
        if (commitments.length < market.MAX_SLOTS()) {
            vm.warp(block.timestamp + COMMIT_WINDOW + 1);
            market.closeCommit(rfqId);
        }
    }

    function _prove(Fixture memory f) internal {
        market.submitProof(f.rfqId, f.winnerIndex, f.winningPriceE6, f.proof);
    }

    /* ------------------------------------ creation ------------------------------------ */

    function test_createRfq() public {
        uint256 rfqId = _createRfq();
        assertEq(rfqId, 1);
        RfqMarket.Rfq memory r = market.getRfq(rfqId);
        assertEq(r.trader, TRADER);
        assertEq(r.amountOut, AMOUNT_OUT);
        assertEq(uint8(r.status), uint8(RfqMarket.Status.OPEN));
        assertEq(r.commitDeadline, uint64(block.timestamp) + COMMIT_WINDOW);
        assertEq(r.settleDeadline, uint64(block.timestamp) + COMMIT_WINDOW + SETTLE_WINDOW);
    }

    /* ----------------------------------- commitment ----------------------------------- */

    function test_fullRoundLocksAndAutoCloses() public {
        Fixture memory f = _fixture("full_a_wins");
        uint256 rfqId = _createRfq();
        _commit(rfqId, f.commitments);
        RfqMarket.Rfq memory r = market.getRfq(rfqId);
        assertEq(uint8(r.status), uint8(RfqMarket.Status.COMMIT_CLOSED));
        assertEq(r.commitmentCount, 5);
        for (uint256 i = 0; i < 5; i++) {
            assertEq(r.makers[i], MAKERS[i]);
            assertEq(r.commitments[i], f.commitments[i]);
            assertEq(market.locked(MAKERS[i]), AMOUNT_OUT);
        }
    }

    function test_partialRoundClosesAtDeadline() public {
        Fixture memory f = _fixture("partial_b_wins");
        uint256 rfqId = _createRfq();
        _commit(rfqId, f.commitments);
        assertEq(uint8(market.getRfq(rfqId).status), uint8(RfqMarket.Status.OPEN));
        vm.expectRevert(RfqMarket.Deadline.selector);
        market.closeCommit(rfqId);
        vm.warp(block.timestamp + COMMIT_WINDOW + 1);
        market.closeCommit(rfqId);
        RfqMarket.Rfq memory r = market.getRfq(rfqId);
        assertEq(uint8(r.status), uint8(RfqMarket.Status.COMMIT_CLOSED));
        assertEq(r.commitmentCount, 3);
        assertEq(r.makers[3], address(0));
        assertEq(r.commitments[4], bytes32(0));
    }

    function test_duplicateCommitRejected() public {
        uint256 rfqId = _createRfq();
        vm.startPrank(MAKERS[0]);
        market.commit(rfqId, bytes32(uint256(1)));
        vm.expectRevert(RfqMarket.AlreadyCommitted.selector);
        market.commit(rfqId, bytes32(uint256(2)));
        vm.stopPrank();
    }

    function test_unregisteredMakerRejected() public {
        uint256 rfqId = _createRfq();
        vm.prank(address(0xBEEF));
        vm.expectRevert(RfqMarket.NotMaker.selector);
        market.commit(rfqId, bytes32(uint256(1)));
    }

    function test_insufficientVaultRejected() public {
        vm.prank(TRADER);
        uint256 rfqId = market.createRfq(101 ether, COMMIT_WINDOW, SETTLE_WINDOW);
        vm.prank(MAKERS[0]);
        vm.expectRevert(RfqMarket.InsufficientVault.selector);
        market.commit(rfqId, bytes32(uint256(1)));
    }

    function test_commitAfterDeadlineRejected() public {
        uint256 rfqId = _createRfq();
        vm.warp(block.timestamp + COMMIT_WINDOW + 1);
        vm.prank(MAKERS[0]);
        vm.expectRevert(RfqMarket.Deadline.selector);
        market.commit(rfqId, bytes32(uint256(1)));
    }

    function test_closeCommitCancelsBelowMinimum() public {
        uint256 rfqId = _createRfq();
        vm.prank(MAKERS[0]);
        market.commit(rfqId, bytes32(uint256(1)));
        vm.prank(MAKERS[1]);
        market.commit(rfqId, bytes32(uint256(2)));
        vm.warp(block.timestamp + COMMIT_WINDOW + 1);
        market.closeCommit(rfqId);
        assertEq(uint8(market.getRfq(rfqId).status), uint8(RfqMarket.Status.CANCELLED));
        assertEq(market.locked(MAKERS[0]), 0);
        assertEq(market.locked(MAKERS[1]), 0);
    }

    /* -------------------------------- proof verification ------------------------------ */

    function test_lifecycle_full_aWins() public {
        _lifecycle("full_a_wins");
    }

    function test_lifecycle_full_eWins() public {
        _lifecycle("full_e_wins");
    }

    function test_lifecycle_partial_bWins() public {
        _lifecycle("partial_b_wins");
    }

    function _lifecycle(string memory name) internal {
        Fixture memory f = _fixture(name);
        uint256 rfqId = _createRfq();
        _commitAndClose(rfqId, f.commitments);

        uint256 gasBefore = gasleft();
        _prove(f);
        emit log_named_uint("submitProof gas", gasBefore - gasleft());

        RfqMarket.Rfq memory r = market.getRfq(rfqId);
        assertEq(uint8(r.status), uint8(RfqMarket.Status.PROVEN));
        assertEq(r.winnerIndex, f.winnerIndex);
        assertEq(r.winningPriceE6, f.winningPriceE6);
        assertEq(r.proofHash, keccak256(f.proof));

        address winner = MAKERS[f.winnerIndex];
        uint256 cost = market.quoteCost(AMOUNT_OUT, f.winningPriceE6);
        uint256 traderUsdcBefore = usdc.balanceOf(TRADER);

        vm.prank(TRADER);
        market.execute(rfqId);

        r = market.getRfq(rfqId);
        assertEq(uint8(r.status), uint8(RfqMarket.Status.SETTLED));
        assertEq(r.usdcPaid, cost);
        assertEq(weth.balanceOf(TRADER), AMOUNT_OUT, "trader receives base");
        assertEq(usdc.balanceOf(TRADER), traderUsdcBefore - cost, "trader pays exact winning price");
        assertEq(usdc.balanceOf(winner), cost, "winner receives USDC");
        assertEq(market.deposited(winner), 100 ether - AMOUNT_OUT, "winner vault debited");
        for (uint256 i = 0; i < 5; i++) {
            assertEq(market.locked(MAKERS[i]), 0, "all locks released");
            if (i != f.winnerIndex) assertEq(market.deposited(MAKERS[i]), 100 ether, "loser vault untouched");
        }
    }

    function test_proofWithWrongWinnerRejected() public {
        Fixture memory f = _fixture("full_e_wins");
        uint256 rfqId = _createRfq();
        _commitAndClose(rfqId, f.commitments);
        vm.expectRevert();
        market.submitProof(rfqId, 0, f.winningPriceE6, f.proof);
        assertEq(uint8(market.getRfq(rfqId).status), uint8(RfqMarket.Status.COMMIT_CLOSED));
    }

    function test_proofWithWrongPriceRejected() public {
        Fixture memory f = _fixture("full_a_wins");
        uint256 rfqId = _createRfq();
        _commitAndClose(rfqId, f.commitments);
        vm.expectRevert();
        market.submitProof(rfqId, f.winnerIndex, f.winningPriceE6 - 1, f.proof);
    }

    function test_tamperedProofBytesRejected() public {
        Fixture memory f = _fixture("full_a_wins");
        uint256 rfqId = _createRfq();
        _commitAndClose(rfqId, f.commitments);
        bytes memory bad = f.proof;
        bad[bad.length / 2] ^= 0x01;
        vm.expectRevert();
        market.submitProof(rfqId, f.winnerIndex, f.winningPriceE6, bad);
    }

    function test_proofBoundToCommitmentSet() public {
        Fixture memory f = _fixture("full_a_wins");
        uint256 rfqId = _createRfq();
        bytes32[] memory altered = f.commitments;
        altered[2] = bytes32(uint256(altered[2]) ^ 1);
        _commitAndClose(rfqId, altered);
        vm.expectRevert();
        _prove(f);
    }

    function test_partialProofBoundToCount() public {
        Fixture memory f = _fixture("partial_b_wins");
        uint256 rfqId = _createRfq();
        bytes32[] memory four = new bytes32[](4);
        for (uint256 i = 0; i < 3; i++) four[i] = f.commitments[i];
        four[3] = bytes32(uint256(0xBEEF));
        _commitAndClose(rfqId, four);
        vm.expectRevert();
        _prove(f);
    }

    function test_proofCannotReplayOnOtherRfq() public {
        Fixture memory f = _fixture("full_a_wins");
        _createRfq();
        uint256 rfqId2 = _createRfq();
        _commitAndClose(rfqId2, f.commitments);
        vm.expectRevert();
        market.submitProof(rfqId2, f.winnerIndex, f.winningPriceE6, f.proof);
    }

    function test_proofBeforeCloseRejected() public {
        Fixture memory f = _fixture("full_a_wins");
        uint256 rfqId = _createRfq();
        vm.prank(MAKERS[0]);
        market.commit(rfqId, f.commitments[0]);
        vm.expectRevert(abi.encodeWithSelector(RfqMarket.BadStatus.selector, RfqMarket.Status.OPEN));
        _prove(f);
    }

    function test_winnerOutsideCountRejected() public {
        Fixture memory f = _fixture("partial_b_wins");
        uint256 rfqId = _createRfq();
        _commitAndClose(rfqId, f.commitments);
        vm.expectRevert(RfqMarket.BadWinner.selector);
        market.submitProof(rfqId, 3, f.winningPriceE6, f.proof);
    }

    /* ----------------------------------- settlement ----------------------------------- */

    function test_executeBeforeProofRejected() public {
        Fixture memory f = _fixture("full_a_wins");
        uint256 rfqId = _createRfq();
        _commitAndClose(rfqId, f.commitments);
        vm.prank(TRADER);
        vm.expectRevert(abi.encodeWithSelector(RfqMarket.BadStatus.selector, RfqMarket.Status.COMMIT_CLOSED));
        market.execute(rfqId);
    }

    function test_doubleExecuteRejected() public {
        Fixture memory f = _fixture("full_a_wins");
        uint256 rfqId = _createRfq();
        _commitAndClose(rfqId, f.commitments);
        _prove(f);
        vm.startPrank(TRADER);
        market.execute(rfqId);
        vm.expectRevert(abi.encodeWithSelector(RfqMarket.BadStatus.selector, RfqMarket.Status.SETTLED));
        market.execute(rfqId);
        vm.stopPrank();
    }

    function test_onlyTraderExecutes() public {
        Fixture memory f = _fixture("full_a_wins");
        uint256 rfqId = _createRfq();
        _commitAndClose(rfqId, f.commitments);
        _prove(f);
        vm.prank(MAKERS[1]);
        vm.expectRevert(RfqMarket.NotTrader.selector);
        market.execute(rfqId);
    }

    function test_traderInsufficientUsdcReverts() public {
        Fixture memory f = _fixture("full_a_wins");
        uint256 rfqId = _createRfq();
        _commitAndClose(rfqId, f.commitments);
        _prove(f);
        vm.startPrank(TRADER);
        usdc.transfer(address(0xDEAD), usdc.balanceOf(TRADER));
        vm.expectRevert("ERC20: balance");
        market.execute(rfqId);
        vm.stopPrank();
    }

    function test_expireUnlocksAfterSettleDeadline() public {
        Fixture memory f = _fixture("full_a_wins");
        uint256 rfqId = _createRfq();
        _commitAndClose(rfqId, f.commitments);
        _prove(f);
        vm.expectRevert(RfqMarket.Deadline.selector);
        market.expire(rfqId);
        vm.warp(block.timestamp + COMMIT_WINDOW + SETTLE_WINDOW + 1);
        market.expire(rfqId);
        assertEq(uint8(market.getRfq(rfqId).status), uint8(RfqMarket.Status.CANCELLED));
        for (uint256 i = 0; i < 5; i++) assertEq(market.locked(MAKERS[i]), 0);
        vm.prank(TRADER);
        vm.expectRevert(abi.encodeWithSelector(RfqMarket.BadStatus.selector, RfqMarket.Status.CANCELLED));
        market.execute(rfqId);
    }

    function test_withdrawRespectsLocks() public {
        Fixture memory f = _fixture("full_a_wins");
        uint256 rfqId = _createRfq();
        _commit(rfqId, f.commitments);
        vm.startPrank(MAKERS[0]);
        vm.expectRevert(RfqMarket.InsufficientVault.selector);
        market.withdraw(100 ether);
        market.withdraw(90 ether);
        vm.stopPrank();
        assertEq(weth.balanceOf(MAKERS[0]), 90 ether);
    }

    function test_publicInputsLayout() public {
        Fixture memory f = _fixture("partial_b_wins");
        uint256 rfqId = _createRfq();
        _commitAndClose(rfqId, f.commitments);
        bytes32[] memory pi = market.publicInputs(rfqId, f.winnerIndex, f.winningPriceE6);
        assertEq(pi.length, 15);
        assertEq(pi[0], bytes32(market.DOMAIN()));
        assertEq(pi[1], bytes32(rfqId));
        for (uint256 i = 0; i < 3; i++) {
            assertEq(pi[2 + i], bytes32(uint256(uint160(MAKERS[i]))));
            assertEq(pi[7 + i], f.commitments[i]);
        }
        assertEq(pi[5], bytes32(0));
        assertEq(pi[11], bytes32(0));
        assertEq(pi[12], bytes32(uint256(3)));
        assertEq(pi[13], bytes32(uint256(f.winnerIndex)));
        assertEq(pi[14], bytes32(uint256(f.winningPriceE6)));
    }
}
