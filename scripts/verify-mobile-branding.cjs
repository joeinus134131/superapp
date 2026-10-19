const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const nextPackage = require.resolve('next/package.json', { paths: [path.join(root, 'web')] });
const sharp = require(require.resolve('sharp', { paths: [path.dirname(nextPackage)] }));
const config = require('../mobile/app.json').expo;
(async () => {
  for (const [file, size] of [['app-icon.png', 1024], ['adaptive-foreground.png', 1024], ['splash-mark.png', 512], ['splash-mark-dark.png', 512]]) {
    const input = path.join(root, 'mobile/assets/branding', file);
    const metadata = await sharp(input).metadata();
    assert.equal(metadata.width, size); assert.equal(metadata.height, size);
    if (file === 'app-icon.png') assert.equal(metadata.hasAlpha, false, 'App Store icon must be opaque RGB');
    const { info } = await sharp(input).trim().png().toBuffer({ resolveWithObject: true });
    const left = Math.abs(info.trimOffsetLeft), top = Math.abs(info.trimOffsetTop);
    assert.ok(Math.abs(left - (size - left - info.width)) <= 2, `${file}: unequal horizontal padding`);
    assert.ok(Math.abs(top - (size - top - info.height)) <= 2, `${file}: unequal vertical padding`);
    assert.ok(left > size * 0.05 && top > size * 0.05, `${file}: artwork touches an edge`);
    if (file === 'adaptive-foreground.png') {
      const { data, info: raw } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let radius = 0;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        if (data[(y * size + x) * raw.channels + 3] > 16) radius = Math.max(radius, Math.hypot(x - (size - 1) / 2, y - (size - 1) / 2));
      }
      assert.ok(radius <= size * 33 / 108, `Adaptive icon extends outside the Android safe circle: ${radius}`);
    }
    console.log(`${file}: ${size}×${size}, centered artwork, safe margins`);
  }
  for (const file of [config.icon, config.splash.image, config.android.adaptiveIcon.foregroundImage]) assert.ok(fs.existsSync(path.join(root, 'mobile', file)));
  const splash = config.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1];
  assert.equal(splash.image, config.splash.image); assert.equal(splash.resizeMode, 'contain'); assert.equal(splash.imageWidth, 160);
  console.log('Expo icon and splash configuration verified.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
