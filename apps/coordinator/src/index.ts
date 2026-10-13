import { getBackend } from "@niskala/zk";
import { startApi } from "./api.ts";
import { startHistory } from "./history.ts";
import { loadRounds } from "./rounds.ts";
import { startWatcher } from "./watcher.ts";

loadRounds();
startHistory();
const t0 = Date.now();
await getBackend();
console.log(`prover: UltraHonk backend ready in ${Date.now() - t0}ms`);
startApi();
await startWatcher();
