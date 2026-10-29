import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';

function findBackendRoot(): string {
  let directory = dirname(fileURLToPath(import.meta.url));
  while (true) {
    const manifest = join(directory, 'package.json');
    if (existsSync(manifest)) {
      const data: unknown = JSON.parse(readFileSync(manifest, 'utf8'));
      if (typeof data === 'object' && data !== null && 'name' in data && data.name === '@wrs/backend') return directory;
    }
    if (directory === parse(directory).root) throw new Error('Backend package root not found.');
    directory = dirname(directory);
  }
}

export const backendRoot = findBackendRoot();
