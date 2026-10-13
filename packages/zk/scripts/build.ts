import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { compileCircuit } from "../src/compile.ts";
import { getSolidityVerifier, getVerificationKey } from "../src/prover.ts";
import { VERIFIER_SOL_PATH, VK_PATH } from "../src/paths.ts";
import { getBarretenberg } from "../src/poseidon.ts";

const t0 = Date.now();
const program = await compileCircuit();
console.log(`compiled best_quote (${program.bytecode.length} b64 bytes) in ${Date.now() - t0}ms`);
const vk = await getVerificationKey();
writeFileSync(VK_PATH, vk);
console.log(`vk: ${vk.length} bytes`);
const sol = await getSolidityVerifier();
mkdirSync(dirname(VERIFIER_SOL_PATH), { recursive: true });
writeFileSync(VERIFIER_SOL_PATH, sol);
console.log(`wrote ${VERIFIER_SOL_PATH} (${sol.length} chars) in ${Date.now() - t0}ms total`);
await (await getBarretenberg()).destroy();
