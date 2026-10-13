#!/usr/bin/env node
/**
 * Deploys every pool in packages/pools/pools.json that has no market address yet, on the chain
 * configured in apps/coordinator/.env: one MockERC20 base token + one RfqMarket per pool, sharing
 * the chain's USDC, HonkVerifier and maker roster. Writes the addresses back into pools.json and
 * submits Sourcify verification (best effort).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, "apps/coordinator/.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
for (const k of ["RPC_URL", "CHAIN_ID", "DEPLOYER_KEY"]) if (!env[k]) throw new Error(`missing ${k} in apps/coordinator/.env`);

const registryPath = resolve(root, "packages/pools/pools.json");
const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const chain = registry[env.CHAIN_ID];
if (!chain) throw new Error(`no registry entry for chain ${env.CHAIN_ID}`);
const only = process.argv.slice(2);

function forgeCreate(contract, args) {
  const quoted = args.map((a) => (Array.isArray(a) ? `"[${a.join(",")}]"` : `"${a}"`)).join(" ");
  const ctor = args.length ? ` --constructor-args ${quoted}` : "";
  const cmd = `forge create ${contract} --rpc-url "${env.RPC_URL}" --private-key ${env.DEPLOYER_KEY} --broadcast --json${ctor}`;
  const out = execSync(cmd, { cwd: resolve(root, "contracts"), env: { ...process.env, FOUNDRY_DISABLE_NIGHTLY_WARNING: "1" }, encoding: "utf8" });
  const start = out.indexOf("{");
  const end = out.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error(`forge create produced no JSON:\n${out.slice(-800)}`);
  const parsed = JSON.parse(out.slice(start, end + 1));
  return { address: parsed.deployedTo, tx: parsed.transactionHash };
}

function verify(address, name) {
  if (env.CHAIN_ID !== "10143" && env.CHAIN_ID !== "143") return;
  try {
    execSync(`forge verify-contract ${address} ${name} --chain ${env.CHAIN_ID} --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/`, {
      cwd: resolve(root, "contracts"),
      stdio: "ignore",
      env: { ...process.env, FOUNDRY_DISABLE_NIGHTLY_WARNING: "1" },
    });
    console.log(`  verified ${name} ${address}`);
  } catch {
    console.log(`  verification skipped for ${address}`);
  }
}

if (!chain.verifier) {
  console.log("deploying HonkVerifier (+ linked libraries) via forge script");
  const verifyFlags = env.CHAIN_ID === "10143" || env.CHAIN_ID === "143" ? " --verify --verifier sourcify --verifier-url https://sourcify-api-monad.blockvision.org/" : "";
  execSync(`forge script script/DeployVerifier.s.sol --rpc-url "${env.RPC_URL}" --broadcast --gas-estimate-multiplier 115${verifyFlags}`, {
    cwd: resolve(root, "contracts"),
    stdio: "inherit",
    env: { ...process.env, DEPLOYER_KEY: env.DEPLOYER_KEY, FOUNDRY_DISABLE_NIGHTLY_WARNING: "1" },
  });
  const v = JSON.parse(readFileSync(resolve(root, `contracts/deployments/${env.CHAIN_ID}-verifier.json`), "utf8"));
  chain.verifier = v.verifier;
  console.log(`  verifier ${v.verifier}`);
  writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
}

let deployed = 0;
for (const pool of chain.pools) {
  if (only.length && !only.includes(pool.slug)) continue;
  if (pool.market) {
    console.log(`${pool.slug}: already deployed at ${pool.market}`);
    continue;
  }
  console.log(`${pool.slug}: deploying`);
  if (!pool.base.address) {
    const token = forgeCreate("src/MockERC20.sol:MockERC20", [`Niskala Mock ${pool.base.symbol}`, pool.base.symbol, String(pool.base.decimals)]);
    pool.base.address = token.address;
    console.log(`  ${pool.base.symbol} token ${token.address}`);
    writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  }
  const market = forgeCreate("src/RfqMarket.sol:RfqMarket", [chain.quote.address, pool.base.address, chain.verifier, chain.makers]);
  pool.market = market.address;
  console.log(`  market ${market.address}`);
  writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  deployed++;
  verify(pool.base.address, "src/MockERC20.sol:MockERC20");
  verify(pool.market, "src/RfqMarket.sol:RfqMarket");
}
console.log(`\n${deployed} pool(s) deployed; registry at packages/pools/pools.json`);
