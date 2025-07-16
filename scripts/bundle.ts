#!/usr/bin/env ts-node

import { bundle } from '@remotion/bundler';
import path from 'path';
import fs from 'fs';

/**
 * Bundles the Remotion project once and returns the serve URL that can be
 * passed to @remotion/renderer renderMedia / renderStill.
 *
 * @param entry Relative path to the Remotion root entry (default remotion/index.tsx)
 * @returns Absolute file:// URL pointing to the out directory.
 */
export async function bundleProject(entry = 'remotion/index.tsx'): Promise<string> {
  const absEntry = path.resolve(entry);
  if (!fs.existsSync(absEntry)) {
    throw new Error(`Remotion entry not found at ${absEntry}`);
  }

  const bundleLocation = await bundle(absEntry, () => undefined, {
    // You can override webpack config here if needed.
    webpackOverride: (config) => config,
  });

  return bundleLocation; // This is the serveUrl (file:// path)
}

// CLI usage: npx ts-node scripts/bundle.ts
if (require.main === module) {
  // eslint-disable-next-line no-console
  console.log('Bundling Remotion project...');
  bundleProject(process.argv[2]).then((url) => {
    // eslint-disable-next-line no-console
    console.log('✅ Bundled! Serve URL: ', url);
  });
} 