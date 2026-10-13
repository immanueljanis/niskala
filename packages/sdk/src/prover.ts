/**
 * Prover surface: build and verify the best-execution proof yourself (for example to run your own
 * coordinator). Re-exported from the workspace's `@niskala/zk`, which bundles the compiled Noir circuit;
 * it needs Node and the monorepo until that package is published.
 */
export { MAX_MAKERS, getBackend, getSolidityVerifier, loadCircuit, proveBestQuote, publicInputsOf, selectWinner, toCircuitInputs, validateWitness, verifyBestQuote, type BestQuoteProof, type RoundWitness } from "@niskala/zk";
