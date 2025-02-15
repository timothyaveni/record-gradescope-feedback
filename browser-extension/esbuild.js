// esbuild.js
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Make sure the 'dist' directory exists
const outDir = path.join(__dirname, 'dist');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

// Copy manifest.json (and any static assets) into dist
// fs.copyFileSync('src/manifest.json', path.join(outDir, 'manifest.json'));
// If you have icons or HTML, you might copy them similarly or do it manually
// e.g. copy icons folder
// fs.cpSync("src/icons", path.join(outDir, "icons"), { recursive: true });

// Build background.ts
esbuild
  .build({
    entryPoints: ['src/background.ts', 'src/popup.ts', 'src/options.ts'],
    bundle: true,
    outdir: 'dist',
    target: ['chrome100', 'firefox100'],
    format: 'esm',
    sourcemap: false,
    // External or not? Usually you want to bundle everything in.
    // But you can mark webextension-polyfill as external if you want.
    // external: ["webextension-polyfill"],
    // Define any global replacements if needed
    define: {},
  })
  .catch(() => process.exit(1));

// copy contents of public/ to dist/
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  fs.readdirSync(publicDir).forEach((file) => {
    fs.copyFileSync(path.join(publicDir, file), path.join(outDir, file));
  });
}
