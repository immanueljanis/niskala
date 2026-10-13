import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(here, "../../..");
export const CIRCUIT_DIR = resolve(REPO_ROOT, "circuits/best_quote");
export const TARGET_DIR = resolve(here, "../target");
export const ARTIFACT_PATH = resolve(TARGET_DIR, "best_quote.json");
export const VK_PATH = resolve(TARGET_DIR, "vk.bin");
export const VERIFIER_SOL_PATH = resolve(REPO_ROOT, "contracts/src/HonkVerifier.sol");
export const FIXTURE_DIR = resolve(REPO_ROOT, "contracts/test/fixtures");
