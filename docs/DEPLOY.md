# Deploying Niskala

Two services: the **coordinator** (Node, long-running: demo makers, prover, relayer, REST API) on Railway, and the
**web app** (Next.js) on Vercel. The chain side (contracts on Monad testnet) is already deployed and verified; nothing
here touches it.

## Coordinator → Railway

Build is the Dockerfile at `apps/coordinator/Dockerfile` with the repo root as context (`railway.json` points at it).
Round records and quote openings live in `apps/coordinator/data`, mounted as a Railway volume so redeploys keep them.

```sh
railway login
railway init --name niskala --workspace "<your workspace>"
railway add --service coordinator
railway service coordinator
railway volume add --mount-path /app/apps/coordinator/data   # run from PowerShell on Windows: Git Bash rewrites /app/... paths
railway variables --service coordinator --skip-deploys \
  --set RPC_URL=https://testnet-rpc.monad.xyz --set CHAIN_ID=10143 \
  --set EXPLORER_TX_BASE=https://testnet.monadvision.com/tx/ \
  --set MM_A_KEY=0x… --set MM_B_KEY=0x… --set MM_C_KEY=0x… --set MM_D_KEY=0x… --set MM_E_KEY=0x… \
  --set RELAYER_KEY=0x… --set REFERENCE_PRICE_E6=3500000000 --set POLL_MS=1500 --set RPC_MAX_RPS=12
railway up --service coordinator --detach
railway domain --service coordinator          # public https domain, used by the web app
```

Railway injects `PORT`; the coordinator reads it. Health check: `GET /api/health`. Logs: `railway logs --service coordinator`.
Redeploy after a code change: `railway up --service coordinator --detach` (uploads the working tree; `.dockerignore` keeps
`apps/web`, `.env*` and build outputs out of the context).

### Cost

The coordinator is one small container: idle CPU is near zero (one batched RPC read every 1.5 s), RAM sits around the
Barretenberg backend (a few hundred MB), proving is a short burst per round. On Railway's usage pricing that is a few
dollars a month, inside the Hobby plan's included usage or the trial credit. To make sure it never exceeds that:

- Dashboard → workspace **Usage** → set a **hard usage limit** (for example $5). Railway stops the service instead of billing past it.
- Keep **one replica** (default) and no autoscaling.
- Delete the service when the hackathon is over; the volume is billed per GB while it exists (it holds kilobytes).

The relayer wallet, not Railway, is the real spend: each proof costs ≈ 0.65 MON of testnet gas (see README "Numbers").

## Web app → Vercel

The Vercel project's **Root Directory** is `apps/web`; deploy from the repo root so the workspace packages
(`@niskala/sdk`) are uploaded too (`.vercelignore` trims build outputs).

```sh
vercel login
cd apps/web && vercel link --project niskala && cd ../..
# one-time: set the root directory (dashboard → Settings → General, or PATCH /v9/projects/niskala {"rootDirectory":"apps/web"})
printf '%s' "https://<coordinator-domain>.up.railway.app" | vercel env add NEXT_PUBLIC_COORDINATOR_URL production
printf '%s' "https://<coordinator-domain>.up.railway.app" | vercel env add NEXT_PUBLIC_COORDINATOR_URL preview
cp apps/web/.vercel/project.json .vercel/project.json
vercel deploy --prod --yes
```

`NEXT_PUBLIC_*` values are inlined at build time, so change the env first, then redeploy. The web app reads the chain
through Ankr by default (`NEXT_PUBLIC_RPC_URL` to override) and only needs the coordinator for maker roster, stats and
proof metadata; with the coordinator down it still shows onchain state.

## After deploying

1. Open `https://<coordinator-domain>/api/health` → `ok: true`, block number advancing.
2. Open the Vercel URL → markets table shows "last proven" prices and the trade page says "Makers live".
3. Run one round from the terminal with a funded wallet, or `pnpm lifecycle:monad` locally with `COORDINATOR_URL`
   pointed at Railway.
4. Keep the relayer topped up (`MIN_RELAYER_GAS=3 RELAYER_TOPUP=6 pnpm setup:monad`).
