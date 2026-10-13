use poseidon::poseidon2::Poseidon2;

/// Maximum number of market-maker slots in one RFQ round. A round may close with fewer
/// (the contract enforces its own minimum); unused slots carry zero commitments and are ignored.
global N: u32 = 5;

/// Proves that `winning_price` is the lowest valid sealed quote among the `count` commitments
/// recorded onchain for this RFQ, without revealing the losers.
///
/// Public inputs are flattened in declaration order for the Solidity verifier:
///   [domain, rfq_id, makers[0..N], commitments[0..N], count, winner_index, winning_price]
///
/// Commitment preimage: Poseidon2(domain, rfq_id, maker, price_e6, salt).
///   domain  = (chainId << 160) | marketAddress  — binds the quote to one chain + market
///   rfq_id  = onchain RFQ id                     — binds the quote to one round
///   maker   = market-maker address               — prevents copying another maker's commitment
fn main(
    domain: pub Field,
    rfq_id: pub Field,
    makers: pub [Field; N],
    commitments: pub [Field; N],
    count: pub u32,
    winner_index: pub u32,
    winning_price: pub u64,
    prices: [u64; N],
    salts: [Field; N],
) {
    assert(count >= 1);
    assert(count <= N);
    assert(winner_index < count);
    for i in 0..N {
        if i < count {
            assert(prices[i] > 0);
            let c = Poseidon2::hash([domain, rfq_id, makers[i], prices[i] as Field, salts[i]], 5);
            assert(c == commitments[i]);
            assert(winning_price <= prices[i]);
            if i < winner_index {
                assert(winning_price < prices[i]);
            }
        }
    }
    assert(winning_price == prices[winner_index]);
}

fn commitments_for(domain: Field, rfq_id: Field, makers: [Field; N], prices: [u64; N], salts: [Field; N], count: u32) -> [Field; N] {
    let mut out = [0; N];
    for i in 0..N {
        if i < count {
            out[i] = Poseidon2::hash([domain, rfq_id, makers[i], prices[i] as Field, salts[i]], 5);
        }
    }
    out
}

#[test]
fn test_full_round_first_minimum_wins() {
    let makers = [11, 22, 33, 44, 55];
    let prices: [u64; 5] = [3505_000000, 3501_250000, 3501_250000, 3509_000000, 3502_000000];
    let salts = [101, 202, 303, 404, 505];
    let commitments = commitments_for(7, 1, makers, prices, salts, 5);
    main(7, 1, makers, commitments, 5, 1, 3501_250000, prices, salts);
}

#[test]
fn test_partial_round_ignores_unused_slots() {
    let makers = [11, 22, 33, 0, 0];
    let prices: [u64; 5] = [3505_000000, 3503_000000, 3501_250000, 0, 0];
    let salts = [101, 202, 303, 0, 0];
    let commitments = commitments_for(7, 1, makers, prices, salts, 3);
    main(7, 1, makers, commitments, 3, 2, 3501_250000, prices, salts);
}

#[test(should_fail)]
fn test_later_tied_index_rejected() {
    let makers = [11, 22, 33, 44, 55];
    let prices: [u64; 5] = [3505_000000, 3501_250000, 3501_250000, 3509_000000, 3502_000000];
    let salts = [101, 202, 303, 404, 505];
    let commitments = commitments_for(7, 1, makers, prices, salts, 5);
    main(7, 1, makers, commitments, 5, 2, 3501_250000, prices, salts);
}

#[test(should_fail)]
fn test_winner_outside_count_rejected() {
    let makers = [11, 22, 33, 44, 55];
    let prices: [u64; 5] = [3505_000000, 3503_000000, 3502_000000, 3501_000000, 3500_000000];
    let salts = [101, 202, 303, 404, 505];
    let commitments = commitments_for(7, 1, makers, prices, salts, 3);
    main(7, 1, makers, commitments, 3, 4, 3500_000000, prices, salts);
}
