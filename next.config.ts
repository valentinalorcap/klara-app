import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // The label-scan Server Action receives a full photo as FormData. The
    // action itself caps each upload at 5 MB; this raises Next's transport
    // ceiling above that so the request reaches the action instead of
    // being rejected with a generic 500.
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
