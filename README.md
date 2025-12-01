# Stash Pay Monorepo

This monorepo contains the Stash Pay React component package and a sample Next.js application demonstrating its usage.

## Structure

```
.
├── packages/
│   └── stash-pay/          # NPM package: @stashgg/stash-pay
│       ├── src/
│       │   ├── StashPay.tsx
│       │   └── index.ts
│       ├── dist/           # Built package output
│       └── package.json
└── sample/                 # Sample Next.js app using the package
    ├── app/
    │   ├── api/
    │   │   └── checkout/
    │   │       └── route.ts
    │   ├── page.tsx
    │   └── layout.tsx
    └── package.json
```

## Packages

### @stashgg/stash-pay

The main React component package for integrating Stash payment checkout.

See [packages/stash-pay/README.md](./packages/stash-pay/README.md) for package documentation.

### Sample App

A Next.js application demonstrating how to use the `@stashgg/stash-pay` package.

## Getting Started

### Installation

Install all dependencies:

```bash
npm install
```

### Development

Run the sample app in development mode:

```bash
npm run dev
```

This will start the Next.js sample app at [http://localhost:3000](http://localhost:3000).

### Building

Build the package:

```bash
npm run build:package
```

Build the sample app:

```bash
npm run build:sample
```

Build everything:

```bash
npm run build
```

## Workspace Scripts

- `npm run dev` - Start the sample app in development mode
- `npm run build` - Build all workspaces
- `npm run build:package` - Build only the @stashgg/stash-pay package
- `npm run build:sample` - Build only the sample app

## Environment Variables

For the sample app, create a `.env.local` file in the `sample/` directory:

```env
STASH_API_KEY=your_stash_api_key_here
```
