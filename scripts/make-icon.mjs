// Rasterise the LatinLearn logo (same design as public/favicon.svg) into PNG app
// icons and a Windows .ico, with no image libraries: just a tiny PNG encoder.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../public/', import.meta.url);

// Logo on a 64-unit grid: gradient rounded square, white "L", 70% white bar.
const inRoundedSquare = (x, y) => {
  const r = 16;
  const cx = x < r ? r : x > 64 - r ? 64 - r : x;
  const cy = y < r ? r : y > 64 - r ? 64 - r : y;
  return x >= 0 && x <= 64 && y >= 0 && y <= 64 && (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const inL = (x, y) => (x >= 18 && x <= 25 && y >= 18 && y <= 46) || (x >= 18 && x <= 39 && y >= 40 && y <= 46);
// GermanLearn, SpanishLearn and FrenchLearn: flag background, white G / S / F and bar with a soft dark
// outline (the same shapes as ICON_LETTER in src/lang.ts).
const LETTERS = {
  de: [[39, 18], [18, 18], [18, 46], [39, 46], [39, 30], [29, 30], [29, 36], [32, 36], [32, 40], [25, 40], [25, 24], [39, 24]],
  es: [[39, 18], [18, 18], [18, 35], [32, 35], [32, 40], [18, 40], [18, 46], [39, 46], [39, 29], [25, 29], [25, 24], [39, 24]],
  fr: [[18, 46], [18, 18], [38, 18], [38, 24], [25, 24], [25, 29], [36, 29], [36, 35], [25, 35], [25, 46]],
};
const inPoly = (poly, x, y) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const RING = Array.from({ length: 12 }, (_, k) => [1.3 * Math.cos((k * Math.PI) / 6), 1.3 * Math.sin((k * Math.PI) / 6)]);
const near = (inside, x, y) => RING.some(([dx, dy]) => inside(x + dx, y + dy));
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const FLAGS = {
  de: (x, y) => hex(y < 21.33 ? '#1a1a1a' : y < 42.67 ? '#dd0000' : '#ffce00'),
  es: (x, y) => hex(y < 16 || y >= 48 ? '#c60b1e' : '#ffc400'),
  fr: (x, y) => hex(x < 21.33 ? '#0055a4' : x < 42.67 ? '#ffffff' : '#ef4135'),
};
const inBar = (x, y) => x >= 42 && x <= 48 && y >= 18 && y <= 46;
const lerp = (a, b, t) => a + (b - a) * t;
const FROM = [0x7c, 0x4d, 0xff];
const TO = [0xff, 0x4f, 0x79];

function render(size, flag, letter) {
  const inLetter = (x, y) => !!letter && inPoly(letter, x, y);
  const px = Buffer.alloc(size * size * 4);
  const ss = 4; // 4×4 supersampling for smooth edges
  for (let py = 0; py < size; py++) {
    for (let pxl = 0; pxl < size; pxl++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = ((pxl + (sx + 0.5) / ss) / size) * 64;
          const y = ((py + (sy + 0.5) / ss) / size) * 64;
          if (!inRoundedSquare(x, y)) continue;
          const t = (x + y) / 128;
          let c = flag ? flag(x, y) : FROM.map((f, k) => lerp(f, TO[k], t));
          if (flag) {
            const mark = (px, py) => inLetter(px, py) || inBar(px, py);
            if (inLetter(x, y)) c = [255, 255, 255];
            else if (inBar(x, y)) c = c.map((v) => lerp(v, 255, 0.8));
            else if (near(mark, x, y)) c = c.map((v) => v * 0.5);
          } else if (inL(x, y)) c = [255, 255, 255];
          else if (inBar(x, y)) c = c.map((v) => lerp(v, 255, 0.7));
          r += c[0]; g += c[1]; b += c[2]; a += 255;
        }
      }
      const n = ss * ss;
      const i = (py * size + pxl) * 4;
      const cover = a / n;
      // Store un-premultiplied colour.
      px[i] = cover ? Math.round(r / (a / 255)) : 0;
      px[i + 1] = cover ? Math.round(g / (a / 255)) : 0;
      px[i + 2] = cover ? Math.round(b / (a / 255)) : 0;
      px[i + 3] = Math.round(cover);
    }
  }
  return px;
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function png(size, flag, letter) {
  const rgba = render(size, flag, letter);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function ico(sizes) {
  const images = sizes.map((s) => png(s));
  const header = Buffer.alloc(6 + 16 * sizes.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = header.length;
  sizes.forEach((s, k) => {
    const e = 6 + k * 16;
    header[e] = s >= 256 ? 0 : s;
    header[e + 1] = s >= 256 ? 0 : s;
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(images[k].length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += images[k].length;
  });
  return Buffer.concat([header, ...images]);
}

writeFileSync(new URL('icon-192.png', OUT), png(192));
writeFileSync(new URL('icon-512.png', OUT), png(512));
writeFileSync(new URL('latinlearn.ico', OUT), ico([16, 24, 32, 48, 64, 128, 256]));
for (const [id, flag] of Object.entries(FLAGS)) {
  writeFileSync(new URL(`icon-${id}-192.png`, OUT), png(192, flag, LETTERS[id]));
  writeFileSync(new URL(`icon-${id}-512.png`, OUT), png(512, flag, LETTERS[id]));
}
console.log('Wrote public/icon-192.png, public/icon-512.png, public/latinlearn.ico and the flag icons');
