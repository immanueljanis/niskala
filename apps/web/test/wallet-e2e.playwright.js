/**
 * Browser end-to-end run of the judge's path with an injected EIP-1193 test wallet
 * (signs locally with TRADER_KEY from the coordinator env file; no MetaMask needed).
 * Drive it with the Playwright MCP tool `browser_run_code_unsafe` (filename option) while
 * the coordinator and `next dev` are running against the same chain.
 * Env file selection: `.env` (Monad testnet) by default; `.env.anvil` for local anvil.
 */
async (page) => {
  const root = "C:/Users/imm/Documents/Personal Folder/Secret/Web3/Hackathon/niskala";
  const envFile = ".env";
  await page.goto(`file:///${root}/apps/coordinator/${envFile}`);
  const envText = await page.evaluate(() => document.body.innerText);
  const env = Object.fromEntries(
    envText
      .split(/\r?\n/)
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
  );
  if (!env.TRADER_KEY || !env.RPC_URL || !env.CHAIN_ID) throw new Error(`could not read ${envFile}`);
  const log = [];
  const t0 = Date.now();
  const say = (m) => log.push(`${((Date.now() - t0) / 1000).toFixed(1)}s ${m}`);

  await page.addInitScript({ path: `${root}/apps/web/node_modules/web3/dist/web3.min.js` });
  await page.addInitScript(
    ({ rpc, key, chainHex }) => {
      const web3 = new window.Web3(rpc);
      const acct = web3.eth.accounts.privateKeyToAccount(key);
      web3.eth.accounts.wallet.add(acct);
      const listeners = {};
      window.ethereum = {
        isMetaMask: true,
        isNiskalaTestWallet: true,
        on(e, h) {
          (listeners[e] ??= []).push(h);
        },
        removeListener(e, h) {
          listeners[e] = (listeners[e] ?? []).filter((x) => x !== h);
        },
        async request({ method, params = [] }) {
          switch (method) {
            case "eth_requestAccounts":
            case "eth_accounts":
              return [acct.address];
            case "eth_chainId":
              return chainHex;
            case "wallet_switchEthereumChain":
            case "wallet_addEthereumChain":
              return null;
            case "eth_sendTransaction": {
              const tx = { ...params[0], from: acct.address };
              if (!tx.gas) tx.gas = ((BigInt(await web3.eth.estimateGas(tx)) * 125n) / 100n).toString();
              const receipt = await web3.eth.sendTransaction(tx);
              return receipt.transactionHash;
            }
            default: {
              const r = await web3.currentProvider.request({ jsonrpc: "2.0", id: Date.now(), method, params });
              return r && typeof r === "object" && "result" in r ? r.result : r;
            }
          }
        },
      };
    },
    { rpc: env.RPC_URL, key: env.TRADER_KEY, chainHex: `0x${Number(env.CHAIN_ID).toString(16)}` },
  );

  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));

  await page.goto("http://localhost:3000/trade");
  await page.getByRole("button", { name: "Connect wallet" }).first().click();
  await page.getByText(/0x[0-9a-f]{6}…[0-9a-f]{6}/i).first().waitFor({ timeout: 20000 });
  say("wallet connected");

  await page.getByRole("button", { name: /Mint 100,000 test USDC/ }).click();
  await page.getByText("Minting…").waitFor({ state: "hidden", timeout: 90000 });
  say("minted test USDC");

  const amount = page.locator("input.mono");
  await amount.fill("10");
  await page.getByRole("button", { name: "Request Private Quotes" }).click();
  await page.waitForURL(/\/rfq\/\d+$/, { timeout: 90000 });
  const rfqUrl = page.url();
  say(`RFQ created → ${rfqUrl}`);

  const seen = new Set();
  const headline = page.locator("h1");
  const deadline = Date.now() + 150000;
  while (Date.now() < deadline) {
    const text = (await headline.textContent().catch(() => "")) ?? "";
    if (text && !seen.has(text)) {
      seen.add(text);
      say(`headline: ${text}`);
    }
    if (text === "Best price proven") break;
    await page.waitForTimeout(500);
  }
  if (!seen.has("Best price proven")) throw new Error(`proof never appeared; saw: ${[...seen].join(" | ")}`);
  await page.getByText("3 / 3 considered").waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${root}/docs/screenshots/round-proven-wallet.png`, fullPage: false });

  const execBtn = page.getByRole("button", { name: /Approve & Execute|^Execute$/ });
  await execBtn.waitFor({ timeout: 15000 });
  say(`execute button: ${await execBtn.textContent()}`);
  await execBtn.click();
  await page.getByText("Execution receipt").waitFor({ timeout: 120000 });
  say("settled: execution receipt visible");
  await page.waitForTimeout(4000);
  const receipt = await page.locator(".card", { hasText: "Execution receipt" }).first().innerText();
  await page.screenshot({ path: `${root}/docs/screenshots/round-settled-wallet.png`, fullPage: true });

  return { log, errors, rfqUrl, receipt: receipt.replace(/\s+/g, " ").slice(0, 700) };
}
