// 站点图标生成器：纯 Node 实现，不依赖任何第三方图形库。
// 运行方式：node scripts/generate_icons.mjs
// 产物：public/favicon.svg、public/icons/*.png、public/site.webmanifest
// 改设计只改本脚本再重跑，禁止直接改二进制产物。

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public');
const ICON_DIR = join(OUT_DIR, 'icons');

// 配色只用项目既定基色与中性色
const COLOR_SKIN = [46, 204, 113, 255];      // 橄榄绿 #2ecc71
const COLOR_SKIN_DARK = [26, 138, 74, 255];  // 底部阴影
const COLOR_EYE = [255, 255, 255, 255];
const COLOR_PUPIL = [16, 20, 26, 255];
const COLOR_MOUTH = [21, 24, 30, 255];

const PNG_SIZES = [32, 180, 192, 512];
const SUPERSAMPLE = 4;

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inEllipse(x, y, cx, cy, rx, ry) {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function blend(dst, i, color, alpha) {
  const a = alpha * (color[3] / 255);
  if (a <= 0) return;
  const inv = 1 - a;
  dst[i] = Math.round(color[0] * a + dst[i] * inv);
  dst[i + 1] = Math.round(color[1] * a + dst[i + 1] * inv);
  dst[i + 2] = Math.round(color[2] * a + dst[i + 2] * inv);
  dst[i + 3] = Math.round(255 * a + dst[i + 3] * inv);
}

// 在归一化坐标 0..1 上绘制僵尸头，再按目标尺寸光栅化
function renderIcon(size) {
  const S = size * SUPERSAMPLE;
  const hi = new Uint8ClampedArray(S * S * 4);

  const px = (nx) => nx * S;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (x + 0.5) / S;
      const ny = (y + 0.5) / S;
      const i = (y * S + x) * 4;

      // 圆角方块底，自上而下做柔和压暗，避免出现生硬的分界线
      if (inRoundRect(nx, ny, 0.04, 0.04, 0.96, 0.96, 0.2)) {
        const t = Math.min(1, Math.max(0, (ny - 0.35) / 0.65));
        const shade = 1 - t * 0.22;
        blend(hi, i, [COLOR_SKIN[0] * shade, COLOR_SKIN[1] * shade, COLOR_SKIN[2] * shade, 255], 1);
      }

      // 两颗眼白
      if (inCircle(nx, ny, 0.36, 0.42, 0.135) || inCircle(nx, ny, 0.655, 0.42, 0.115)) {
        blend(hi, i, COLOR_EYE, 1);
      }

      // 瞳孔，整体偏右，像在盯着前方
      if (inCircle(nx, ny, 0.395, 0.42, 0.062) || inCircle(nx, ny, 0.678, 0.42, 0.052)) {
        blend(hi, i, COLOR_PUPIL, 1);
      }

      // 咧嘴
      if (inRoundRect(nx, ny, 0.33, 0.665, 0.7, 0.76, 0.045)) {
        blend(hi, i, COLOR_MOUTH, 1);
      }

      // 两颗小尖牙
      if (inEllipse(nx, ny, 0.41, 0.672, 0.026, 0.032) || inEllipse(nx, ny, 0.6, 0.672, 0.026, 0.032)) {
        blend(hi, i, COLOR_EYE, 1);
      }
    }
  }

  // 盒式降采样，得到抗锯齿边缘
  const out = Buffer.alloc(size * size * 4);
  const n = SUPERSAMPLE * SUPERSAMPLE;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const si = (((y * SUPERSAMPLE + sy) * S) + (x * SUPERSAMPLE + sx)) * 4;
          r += hi[si];
          g += hi[si + 1];
          b += hi[si + 2];
          a += hi[si + 3];
        }
      }
      const di = (y * size + x) * 4;
      out[di] = Math.round(r / n);
      out[di + 1] = Math.round(g / n);
      out[di + 2] = Math.round(b / n);
      out[di + 3] = Math.round(a / n);
    }
  }
  return out;
}

function buildSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="僵尸狂潮">
  <defs>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3fe08a"/>
      <stop offset="1" stop-color="#24a45c"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="92" height="92" rx="20" fill="url(#skin)"/>
  <circle cx="36" cy="42" r="13.5" fill="#ffffff"/>
  <circle cx="65.5" cy="42" r="11.5" fill="#ffffff"/>
  <circle cx="39.5" cy="42" r="6.2" fill="#10141a"/>
  <circle cx="67.8" cy="42" r="5.2" fill="#10141a"/>
  <rect x="33" y="66.5" width="37" height="9.5" rx="4.5" fill="#15181e"/>
  <ellipse cx="41" cy="67.2" rx="2.6" ry="3.2" fill="#ffffff"/>
  <ellipse cx="60" cy="67.2" rx="2.6" ry="3.2" fill="#ffffff"/>
</svg>
`;
}

function buildManifest() {
  return JSON.stringify({
    name: '僵尸狂潮 PC 网页版',
    short_name: '僵尸狂潮',
    description: '基于 HTML5 Canvas 的横版僵尸跑酷游戏',
    start_url: '/',
    display: 'fullscreen',
    background_color: '#12141a',
    theme_color: '#2ecc71',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }, null, 2) + '\n';
}

mkdirSync(ICON_DIR, { recursive: true });

const written = [];
for (const size of PNG_SIZES) {
  const png = encodePng(size, size, renderIcon(size));
  const name = size === 32
    ? 'favicon-32.png'
    : (size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`);
  const path = join(ICON_DIR, name);
  writeFileSync(path, png);
  written.push({ path: `public/icons/${name}`, bytes: png.length });
}

writeFileSync(join(OUT_DIR, 'favicon.svg'), buildSvg());
written.push({ path: 'public/favicon.svg', bytes: Buffer.byteLength(buildSvg()) });

writeFileSync(join(OUT_DIR, 'site.webmanifest'), buildManifest());
written.push({ path: 'public/site.webmanifest', bytes: Buffer.byteLength(buildManifest()) });

for (const f of written) {
  console.log(`${f.path}  ${f.bytes} 字节`);
}
console.log(`共生成 ${written.length} 个文件`);
