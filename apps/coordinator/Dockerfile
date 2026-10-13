# Niskala coordinator: demo makers, prover (bb.js UltraHonk) and relayer. Build context is the repo root
# so the workspace packages (@niskala/sdk, @niskala/zk, abi, pools) are available.
FROM node:24-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV CI=true
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/coordinator/package.json apps/coordinator/
COPY packages/sdk/package.json packages/sdk/
COPY packages/zk/package.json packages/zk/
COPY packages/abi/package.json packages/abi/
COPY packages/pools/package.json packages/pools/
RUN pnpm install --frozen-lockfile --filter @niskala/coordinator...

COPY packages/abi packages/abi
COPY packages/pools packages/pools
COPY packages/sdk packages/sdk
COPY packages/zk packages/zk
COPY apps/coordinator apps/coordinator

# Round records and quote openings live here; a Railway volume is mounted on this path so redeploys keep them
# (Railway rejects a Dockerfile VOLUME instruction, so the mount is configured on the service instead).
RUN mkdir -p /app/apps/coordinator/data

WORKDIR /app/apps/coordinator
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "--import", "tsx", "src/index.ts"]
