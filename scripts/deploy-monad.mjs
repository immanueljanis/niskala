#!/usr/bin/env node
/**
 * Deploys Niskala to the chain configured in apps/coordinator/.env (Monad testnet by default),
 * then writes the resulting addresses into apps/coordinator/.env and apps/web/.env.local.
 *
 * Requires: DEPLOYER_KEY funded with MON, MAKERS (3 comma-separated addresses), RPC_URL, CHAIN_ID.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, "apps/coordinator/.env");
if (!existsSync(envPath)) {
  console.error("apps/coordinator/.env not found. Copy .env.example and fill the keys first.");
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
for (const k of ["RPC_URL", "CHAIN_ID", "DEPLOYER_KEY", "MAKERS"]) {
  if (!env[k]) {
    console.error(`missing ${k} in apps/coordinator/.env`);
    process.exit(1);
  }
}

console.log(`deploying to chain ${env.CHAIN_ID} via ${env.RPC_URL}`);
execSync(`forge script script/Deploy.s.sol --rpc-url "${env.RPC_URL}" --broadcast --gas-estimate-multiplier 115`, {
  cwd: resolve(root, "contracts"),
  stdio: "inherit",
  env: { ...process.env, DEPLOYER_KEY: env.DEPLOYER_KEY, MAKERS: env.MAKERS, FOUNDRY_DISABLE_NIGHTLY_WARNING: "1" },
});

const deployment = JSON.parse(readFileSync(resolve(root, `contracts/deployments/${env.CHAIN_ID}.json`), "utf8"));
const setLine = (text, key, value) => (new RegExp(`^${key}=.*$`, "m").test(text) ? text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`) : `${text.trimEnd()}\n${key}=${value}\n`);

let coord = readFileSync(envPath, "utf8");
coord = setLine(coord, "MARKET_ADDRESS", deployment.market);
coord = setLine(coord, "USDC_ADDRESS", deployment.usdc);
coord = setLine(coord, "WETH_ADDRESS", deployment.weth);
writeFileSync(envPath, coord);

const webEnvPath = resolve(root, "apps/web/.env.local");
const explorer = env.CHAIN_ID === "10143" ? "https://testnet.monadvision.com" : env.CHAIN_ID === "143" ? "https://monadvision.com" : env.RPC_URL;
let web = existsSync(webEnvPath) ? readFileSync(webEnvPath, "utf8") : "";
web = setLine(web, "NEXT_PUBLIC_CHAIN_ID", env.CHAIN_ID);
web = setLine(web, "NEXT_PUBLIC_RPC_URL", env.RPC_URL);
web = setLine(web, "NEXT_PUBLIC_EXPLORER_URL", explorer);
web = setLine(web, "NEXT_PUBLIC_MARKET_ADDRESS", deployment.market);
web = setLine(web, "NEXT_PUBLIC_USDC_ADDRESS", deployment.usdc);
web = setLine(web, "NEXT_PUBLIC_WETH_ADDRESS", deployment.weth);
web = setLine(web, "NEXT_PUBLIC_COORDINATOR_URL", `http://localhost:${env.PORT ?? "8787"}`);
writeFileSync(webEnvPath, web);

console.log("\nwrote addresses to apps/coordinator/.env and apps/web/.env.local");
console.log(deployment);

if (env.CHAIN_ID === "10143" || env.CHAIN_ID === "143") {
  const targets = [
    [deployment.market, "src/RfqMarket.sol:RfqMarket"],
    [deployment.verifier, "src/HonkVerifier.sol:HonkVerifier"],
    [deployment.usdc, "src/MockERC20.sol:MockERC20"],
    [deployment.weth, "src/MockERC20.sol:MockERC20"],
  ];
  console.log("\nverifying on MonadVision (Sourcify) — best effort");
  for (const [address, name] of targets) {
    try {
      execSync(`forge verify-contract ${address} ${name} --chain ${env.CHAIN_ID} --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/`, {
        cwd: resolve(root, "contracts"),
        stdio: "inherit",
        env: { ...process.env, FOUNDRY_DISABLE_NIGHTLY_WARNING: "1" },
      });
    } catch {
      console.log(`verification skipped for ${name} at ${address} (re-run manually later)`);
    }
  }
}
