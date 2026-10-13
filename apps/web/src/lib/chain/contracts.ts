import { Niskala, STATUS_NAMES, type Balances, type ChainRfq, type PoolSpec, type StatusName, type TxResult } from "@niskala/sdk";
import { CHAIN_ID, COORDINATOR_URL, RPC_URL } from "./network";
import { getInjectedProvider } from "./web3";

export type { Balances, ChainRfq, StatusName, TxResult };
export { STATUS_NAMES };

let reader: Niskala | undefined;
let wallet: Niskala | undefined;

/** Read-only SDK client over the public RPC. Works without a wallet. */
export function getReader(): Niskala {
  reader ??= new Niskala({ chainId: CHAIN_ID, provider: RPC_URL, coordinatorUrl: COORDINATOR_URL });
  return reader;
}

/** SDK client over the injected EIP-1193 wallet; every write goes through the user's signer. */
export function getWalletClient(): Niskala {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No injected wallet found. Install MetaMask or another EIP-1193 wallet.");
  wallet ??= new Niskala({ chainId: CHAIN_ID, provider, coordinatorUrl: COORDINATOR_URL });
  return wallet;
}

export const getRfq = (pool: PoolSpec, rfqId: string) => getReader().getRfq(pool, rfqId);
export const getRfqCount = (pool: PoolSpec) => getReader().getRfqCount(pool);
export const quoteCost = (pool: PoolSpec, amountOut: string, priceE6: string) => getReader().quoteCost(pool, amountOut, priceE6);
export const getPoolLiquidity = (pool: PoolSpec, makers: string[]) => getReader().poolLiquidity(pool, makers);
export const getBalances = (address: string) => getReader().balances(address);
export const getTokenBalance = (address: string, token: string) => getReader().tokenBalance(token, address);
export const getUsdcAllowance = (owner: string, pool: PoolSpec) => getReader().usdcAllowance(pool, owner);
export const getBlockNumber = () => getReader().blockNumber();

export const createRfq = (from: string, pool: PoolSpec, amountOut: string, commitWindowSec: number, settleWindowSec: number) => getWalletClient().createRfq(pool, amountOut, { from, commitWindowSec, settleWindowSec });
export const approveUsdc = (from: string, pool: PoolSpec, amount: string) => getWalletClient().approveUsdc(pool, amount, { from });
export const mintUsdc = (from: string, amount: string) => getWalletClient().mintUsdc(amount, { from });
export const executeRfq = (from: string, pool: PoolSpec, rfqId: string) => getWalletClient().executeRfq(pool, rfqId, { from });
