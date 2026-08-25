const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const root = path.resolve(__dirname, '..');
const input = path.join(root, 'assets', 'icon-bell-character-source.png');
const output = path.join(root, 'assets', 'icon-bell-character.png');
const source = PNG.sync.read(fs.readFileSync(input));
const size = 1024;
const contentSize = 730;
const offset = Math.floor((size - contentSize) / 2);
const target = new PNG({ width: size, height: size, colorType: 6 });

for (let y = 0; y < contentSize; y += 1) {
  const sourceY = Math.min(source.height - 1, Math.floor((y / contentSize) * source.height));
  for (let x = 0; x < contentSize; x += 1) {
    const sourceX = Math.min(source.width - 1, Math.floor((x / contentSize) * source.width));
    const sourceIndex = (sourceY * source.width + sourceX) * 4;
    const targetIndex = ((y + offset) * size + x + offset) * 4;
    source.data.copy(target.data, targetIndex, sourceIndex, sourceIndex + 4);
  }
}

fs.writeFileSync(output, PNG.sync.write(target));
console.log(`Prepared ${output}`);
