// Dipisah dari vite.config.ts: vitest membawa tipe vite sendiri, sehingga plugin vite 6 bentrok tipe bila digabung.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' }
});
