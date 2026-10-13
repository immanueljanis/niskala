# Threat model

| Threat | Mitigation in this build | Gap / roadmap |
|---|---|---|
| Router prefers a partner maker | Winner must satisfy `winningPrice <= price_i` for every committed slot; proof is bound to the exact onchain commitment set | — |
| Router alters a quote | Opening must hash to the onchain commitment (Poseidon2 inside the circuit) | — |
| Maker changes quote after seeing others | Sealed commitment before the deadline; nothing but hashes onchain | — |
| Maker copies another maker's commitment | Maker address is part of the hash preimage and a public input | — |
| Proof replayed on another RFQ / chain / market | Public inputs rebuilt from storage; `domain = chainId<<160 \| market`; `rfqId` in preimage | — |
| Prover fabricates a winner | Honk verifier rejects (tested onchain: wrong winner, wrong price, tampered bytes, altered commitment) | — |
| Maker commits but withholds opening | Demo makers always deliver; an external SDK maker could stall a round until `settleDeadline`, then `expire` unlocks everyone | V1: delivery receipts + bond + slashing / exclusion |
| Forged or mismatched opening from an external maker | Opening must be signed by the committed maker (EIP-191 over a canonical message with chainId, market, rfqId) and must hash to that maker's onchain commitment; otherwise rejected before it reaches the witness | — |
| Trader sees losing quotes | Frontend, API and chain never carry them; API strips openings before serialization | — |
| Coordinator sees losing quotes | **Accepted for the MVP** and stated in the UI/README | MPC / FHE / TEE proving, distributed witness |
| Front-running the winner | Commitments carry no price; winning price appears only in `submitProof` after the commit window closed | — |
| Trader refuses to execute | Capital locked only until `settleDeadline`; `expire` releases | — |
| Griefing with RFQs that never fill | Maker capital locks per commitment; makers decide whether to commit; `closeCommit` cancels incomplete rounds | Fees / bonds for RFQ creation |
| Relayer censorship | `submitProof` is permissionless; any party holding the proof can submit | — |
| Trusted setup | UltraHonk/KZG uses the Aztec ignition SRS shipped with bb.js | — |

## Explicit non-claims

- Not "nobody sees losing quotes".
- Not "trustless confidentiality against the prover".
- Not "fully private market making".
- Not arbitrary-size completeness: the circuit is fixed at five slots with a public `count` and proves over exactly the committed set (three to five commitments).
