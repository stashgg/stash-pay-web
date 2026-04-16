# Stash Pay Checkout Dialog For Web

This repository contains the Stash Pay SDK package and a Next.js playground demonstrating its usage.

## Packages

### @stashgg/stash-pay

The Stash Pay SDK, published to npm. Ships three entry points from a single install:

- **React component** — `import { StashPay } from '@stashgg/stash-pay'`
- **Framework-agnostic core** — `import { open } from '@stashgg/stash-pay/vanilla'`
- **Script-tag UMD** — `<script src="https://unpkg.com/@stashgg/stash-pay@2/dist/umd/stash-pay.umd.global.js">` exposes `window.StashPay.open({ … })` (works inside Unity WebGL and any HTML page)

See [packages/stash-pay/README.md](./packages/stash-pay/README.md) for the full API reference, [packages/stash-pay/MIGRATION.md](./packages/stash-pay/MIGRATION.md) for the v1→v2 upgrade path.

### Sample App

A Next.js 16 playground: paste a Stash Pay checkout URL, tweak the config, watch callbacks stream into the reaction log. Published at [https://stash-pay-web.vercel.app/](https://stash-pay-web.vercel.app/).

The sample also ships a no-React smoke page at `/umd-test.html` which loads the UMD bundle directly from `<script>`.

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This starts the Next.js playground at [http://localhost:3000](http://localhost:3000). The SDK is consumed from the monorepo workspace, so changes under `packages/stash-pay/src/` are picked up after `npm run build:package`.

### Building

```bash
npm run build:package   # only the SDK (tsup produces ESM + CJS + UMD + .d.ts + CSS)
npm run build:sample    # Next.js build (prebuild hook rebuilds the package)
npm run build           # both
```

## Workspace Scripts

- `npm run dev` — start the sample playground
- `npm run build` — build all workspaces
- `npm run build:package` — build only `@stashgg/stash-pay`
- `npm run build:sample` — build only the playground (rebuilds the SDK first)
- `npm run typecheck --workspace=@stashgg/stash-pay` — typecheck the SDK without emitting

## Generating a checkout URL

The playground doesn't call the Stash Pay API directly — you paste a pre-generated checkout URL. See the [Stash Pay integration guide](https://docs.stash.gg/guides/stash-pay/integration) for how to generate one from your server.
