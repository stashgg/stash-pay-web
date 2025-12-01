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
  - Add a new secret named `NPM_TOKEN` with your npm granular access token
  - **Important**: You must create a **Granular Access Token** with **"Bypass 2FA"** enabled
  - Granular tokens with bypass 2FA don't require OTP and work in CI/CD
  - Generate a token at: https://www.npmjs.com/settings/stashgg/tokens
  - Click "Generate New Token" → Select "Granular Access Token"
  - Enable "Bypass 2FA" option and set permissions to "Read and write" or "Publish"
  - Make sure it has access to the `@stashgg` scope
  - See [.github/NPM_SETUP.md](.github/NPM_SETUP.md) for detailed instructions
  - If you use a token without bypass 2FA enabled, you'll get an OTP error

### Manual Publishing

To manually publish the `@stashgg/stash-pay` package to npm:

1. Build the package: `npm run build:package`
2. Navigate to the package directory: `cd packages/stash-pay`
3. Update version if needed: `npm version patch|minor|major`
4. Publish: `npm publish --access public`

### Troubleshooting Publishing

**Error: `404 Not Found - PUT https://registry.npmjs.org/@stashgg%2fstash-pay`**

This error means the `@stashgg` organization doesn't exist on npm yet, or you don't have publish permissions. To fix:

1. **Create the organization** (if it doesn't exist):
   - Go to https://www.npmjs.com/org/create
   - Create an organization named `stashgg`
   - Add team members as needed

2. **Verify organization access**:
   - Go to https://www.npmjs.com/settings/stashgg/teams
   - Ensure your npm account is a member with publish permissions
   - For CI/CD, you may need to add a team with publish access

3. **Verify token permissions**:
   - Ensure your `NPM_TOKEN` has access to the `@stashgg` scope
   - The token must have "Publish" or "Read and write" permissions for the organization
   - Regenerate the token if needed with correct scope/permissions

4. **Test locally first**:
   ```bash
   npm login
   npm whoami
   npm org ls stashgg
   cd packages/stash-pay
   npm publish --access public --dry-run
   ```

## License

MIT
