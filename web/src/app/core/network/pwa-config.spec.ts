import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface NgswConfig {
  navigationUrls?: string[];
  dataGroups?: { urls: string[] }[];
  assetGroups: { resources: { files?: string[]; urls?: string[] } }[];
}

interface WebManifest {
  icons: { sizes: string; purpose: string }[];
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(resolve(process.cwd(), relativePath), 'utf8')) as T;
}

describe('configuración PWA', () => {
  it('ngswConfigShouldNotCacheApiRoutes', () => {
    const config = readJson<NgswConfig>('ngsw-config.json');
    const dataUrls = (config.dataGroups ?? []).flatMap((group) => group.urls);
    const assetUrls = config.assetGroups.flatMap((group) => [
      ...(group.resources.files ?? []),
      ...(group.resources.urls ?? []),
    ]);

    expect(dataUrls.some((url) => url.startsWith('/api'))).toBe(false);
    expect(assetUrls.some((url) => url.startsWith('/api'))).toBe(false);
    expect(config.navigationUrls).toContain('!/api/**');
  });

  it('manifestShouldDeclareStandaloneSpanishApp', () => {
    const manifest = readJson<WebManifest>('public/manifest.webmanifest');

    expect(manifest).toMatchObject({
      name: '4adra',
      short_name: '4adra',
      lang: 'es',
      display: 'standalone',
      start_url: '/',
      scope: '/',
    });
    const icons = manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose}`);
    expect(icons).toEqual(
      expect.arrayContaining(['192x192 any', '512x512 any', '512x512 maskable']),
    );
  });
});
