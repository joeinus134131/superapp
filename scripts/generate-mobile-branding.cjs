// Prepare centered platform assets from the cleaned original Whenya mark.
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const nextPackage = require.resolve('next/package.json', { paths: [path.join(root, 'web')] });
const sharp = require(require.resolve('sharp', { paths: [path.dirname(nextPackage)] }));
const directory = path.join(root, 'mobile/assets/branding');
const master = path.join(directory, 'mark-master.png');
async function centeredMark(size, contentSize, background, output, dark = false) {
  const tight = await sharp(master).trim().png().toBuffer();
  const artwork = sharp(tight).resize(contentSize, contentSize, { fit: 'inside' });
  // Lift the same mark's colors for contrast on the dark loading surface.
  if (dark) artwork.linear(0.5, 130);
  const glyph = await artwork.png().toBuffer();
  const canvas = sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: glyph, gravity: 'center' }]);
  if (output === 'app-icon.png') canvas.removeAlpha();
  await canvas.png().toFile(path.join(directory, output));
}
(async () => {
  await centeredMark(1024, 640, '#F7F4EC', 'app-icon.png');
  await centeredMark(1024, 456, '#00000000', 'adaptive-foreground.png');
  await centeredMark(512, 448, '#00000000', 'splash-mark.png');
  await centeredMark(512, 448, '#00000000', 'splash-mark-dark.png', true);
  console.log('Prepared centered app icon, adaptive foreground, and light/dark splash marks.');
})().catch(error => { console.error(error); process.exitCode = 1; });
