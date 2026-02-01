import type { SnapConfig } from '@metamask/snaps-cli';

const config: SnapConfig = {
  bundler: 'webpack',
  input: 'src/index.ts',
  server: {
    port: 5004, // Registered in ~/.port-registry for crypto-guardian
  },
  polyfills: true,
};

export default config;
