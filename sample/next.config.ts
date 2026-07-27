import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@stashgg/stash-pay'],
  // Delegate the `payment` permission to the embedded checkout iframe so
  // Apple Pay / the Payment Request API can initialize inside it. The iframe's
  // own `allow="payment"` only delegates the permission — the host document
  // must actually grant it via this header, which has no <meta> equivalent.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Permissions-Policy', value: 'payment=*' },
        ],
      },
    ];
  },
};

export default nextConfig;
