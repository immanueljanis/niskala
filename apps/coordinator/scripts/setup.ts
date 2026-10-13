import { addWallet, sendWithEstimate, web3 } from "../src/chain.ts";
import { config } from "../src/config.ts";
import { makers } from "../src/makers.ts";
import { pools, usdc } from "../src/pools.ts";

/**
 * Funding for a deployment:
 *  - tops up MM + relayer + trader wallets with MON for gas from DEPLOYER_KEY
 *  - for every pool: mints the base token to each MM, approves, and deposits `makerDeposit` into that market
 *  - optionally mints MockUSDC to TRADER_ADDRESS
 */
const deployer = addWallet(process.env.DEPLOYER_KEY ?? "");
const relayer = addWallet(config.relayerKey);
const MIN_MM_GAS = web3.utils.toWei(process.env.MIN_MM_GAS ?? "0.3", "ether");
const MM_TOPUP = web3.utils.toWei(process.env.MM_TOPUP ?? "0.5", "ether");
const MIN_RELAYER_GAS = web3.utils.toWei(process.env.MIN_RELAYER_GAS ?? "0.75", "ether");
const RELAYER_TOPUP = web3.utils.toWei(process.env.RELAYER_TOPUP ?? "1.5", "ether");
const only = process.argv.slice(2);

async function topUp(label: string, address: string, min: string, amount: string) {
  const bal = BigInt(await web3.eth.getBalance(address));
  if (bal >= BigInt(min)) return console.log(`${label} ${address}: ${web3.utils.fromWei(bal, "ether")} MON (ok)`);
  const receipt = await web3.eth.sendTransaction({ from: deployer.address, to: address, value: amount, gas: "21000" });
  console.log(`${label} ${address}: funded ${web3.utils.fromWei(amount, "ether")} MON tx ${receipt.transactionHash}`);
}

console.log(`deployer ${deployer.address}: ${web3.utils.fromWei(await web3.eth.getBalance(deployer.address), "ether")} MON`);
await topUp("relayer", relayer.address, MIN_RELAYER_GAS, RELAYER_TOPUP);
for (const mm of makers) await topUp(mm.id, mm.address, MIN_MM_GAS, MM_TOPUP);

for (const pool of pools) {
  if (only.length && !only.includes(pool.slug)) continue;
  const target = BigInt(web3.utils.toWei(pool.spec.makerDeposit, "ether"));
  for (const mm of makers) {
    const deposited = BigInt(await pool.market.methods.deposited(mm.address).call());
    if (deposited >= target) {
      console.log(`${pool.slug} ${mm.id}: vault ${web3.utils.fromWei(deposited, "ether")} ${pool.spec.base.symbol} (ok)`);
      continue;
    }
    const need = target - deposited;
    await sendWithEstimate(pool.base.methods.mint(mm.address, need), deployer.address);
    await sendWithEstimate(pool.base.methods.approve(pool.spec.market, need), mm.address);
    const tx = await sendWithEstimate(pool.market.methods.deposit(need), mm.address);
    console.log(`${pool.slug} ${mm.id}: deposited ${web3.utils.fromWei(need, "ether")} ${pool.spec.base.symbol} tx ${tx.txHash}`);
  }
}

const trader = process.env.TRADER_ADDRESS;
if (trader) {
  await topUp("trader", trader, web3.utils.toWei("0.15", "ether"), web3.utils.toWei("0.3", "ether"));
  const bal = BigInt(await usdc.methods.balanceOf(trader).call());
  if (bal < 100_000n * 10n ** 6n) {
    const tx = await sendWithEstimate(usdc.methods.mint(trader, 1_000_000n * 10n ** 6n), deployer.address);
    console.log(`trader ${trader}: minted 1,000,000 USDC tx ${tx.txHash}`);
  }
}
console.log("setup complete");
process.exit(0);
