import type { NextConfig } from 'next';
const config: NextConfig = { output: 'standalone', serverExternalPackages: ['argon2'], poweredByHeader: false,
  outputFileTracingExcludes: { '/*': ['./.local/**/*', './.env*', './api key.txt', './test-results/**/*', './tests/**/*'] },
  async headers() { return [{ source: '/:path*', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'same-origin' }, { key: 'X-Frame-Options', value: 'DENY' }] }]; }
};
export default config;
