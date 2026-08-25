const fs = require('fs');
const { PNG } = require('pngjs');

const size = 1024;
const png = new PNG({ width: size, height: size });
const colors = {
  green: [11, 61, 41, 255],
  greenLight: [15, 78, 52, 255],
  gold: [207, 160, 85, 255],
  goldLight: [244, 210, 133, 255],
  goldDark: [151, 104, 39, 255],
};

function pixel(x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (Math.floor(y) * size + Math.floor(x)) * 4;
  png.data[i] = color[0]; png.data[i + 1] = color[1]; png.data[i + 2] = color[2]; png.data[i + 3] = 255;
}
function rect(x, y, w, h, color, radius = 0) {
  for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) {
    const dx = Math.max(x + radius - px, 0, px - (x + w - radius - 1));
    const dy = Math.max(y + radius - py, 0, py - (y + h - radius - 1));
    if (!radius || dx * dx + dy * dy <= radius * radius) pixel(px, py, color);
  }
}
function ellipse(cx, cy, rx, ry, color, top = -Infinity, bottom = Infinity) {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(size - 1, Math.ceil(cy + ry)); y++) {
    if (y < top || y > bottom) continue;
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(size - 1, Math.ceil(cx + rx)); x++) {
      if (((x - cx) ** 2) / (rx ** 2) + ((y - cy) ** 2) / (ry ** 2) <= 1) pixel(x, y, color);
    }
  }
}

for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  const glow = Math.max(0, 1 - Math.hypot(x - 512, y - 500) / 720);
  pixel(x, y, glow > .45 ? colors.greenLight : colors.green);
}

// Handle and neck.
ellipse(512, 250, 104, 42, colors.goldDark);
ellipse(512, 238, 104, 38, colors.goldLight);
rect(479, 250, 66, 128, colors.gold, 18);
rect(493, 252, 18, 122, colors.goldLight, 8);
ellipse(512, 378, 92, 38, colors.goldDark);
ellipse(512, 365, 86, 34, colors.gold);

// Bell dome and metallic highlight.
ellipse(512, 560, 292, 245, colors.goldDark, 365, 700);
ellipse(512, 538, 276, 226, colors.gold, 365, 690);
ellipse(430, 485, 102, 128, colors.goldLight, 390, 590);
ellipse(446, 500, 84, 111, colors.gold, 414, 590);

// Rim, opening and base.
rect(190, 650, 644, 90, colors.goldDark, 44);
rect(204, 635, 616, 82, colors.goldLight, 40);
rect(230, 666, 564, 42, colors.gold, 20);
ellipse(512, 741, 244, 58, colors.goldDark);
ellipse(512, 726, 220, 42, [72, 48, 20, 255]);
rect(180, 744, 664, 106, colors.goldDark, 52);
rect(198, 728, 628, 96, colors.gold, 48);
rect(218, 744, 588, 28, colors.goldLight, 14);

fs.writeFileSync(process.argv[2] || 'assets/icon-bell.png', PNG.sync.write(png));
