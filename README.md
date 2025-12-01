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

## Publishing the Package

### Automated Publishing (GitHub Actions)

The package is automatically published to npm via GitHub Actions when:

1. **Tag-based release**: Push a version tag (e.g., `v1.0.0`)
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Manual workflow**: Use the "Build and Publish" workflow in GitHub Actions and provide a version number

**Required Setup:**
- Add an `NPM_TOKEN` secret to your GitHub repository settings
  - Go to Settings → Secrets and variables → Actions
  - Add a new secret named `NPM_TOKEN` with your npm access token
  - Generate a token at https://www.npmjs.com/settings/YOUR_USERNAME/tokens (use "Automation" type)

### Manual Publishing

To manually publish the `@stashgg/stash-pay` package to npm:

1. Build the package: `npm run build:package`
2. Navigate to the package directory: `cd packages/stash-pay`
3. Update version if needed: `npm version patch|minor|major`
4. Publish: `npm publish --access public`

## License

MIT
