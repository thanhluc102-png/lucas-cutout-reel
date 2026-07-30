#!/usr/bin/env node
/**
 * RENDER CUTOUT REEL — Dựng MP4 9:16 dạng Product Cutout Sheen Motion.
 *
 *   node scripts/render.mjs jobs/<id>.json
 *   -> jobs/<id>/final.mp4
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const file = process.argv[2];
if (!file) {
  console.error('Dùng: node scripts/render.mjs jobs/<id>.json');
  process.exit(2);
}

const job = JSON.parse(fs.readFileSync(file, 'utf8'));
const jobDir = path.join(path.dirname(file), path.basename(file, '.json'));
const assetsDir = path.join(jobDir, 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

// Copy logo và bgm
if (fs.existsSync(path.join(root, 'assets', 'logo.png'))) {
  fs.copyFileSync(path.join(root, 'assets', 'logo.png'), path.join(assetsDir, 'logo.png'));
}
if (fs.existsSync(path.join(root, 'assets', 'bgm.mp4'))) {
  fs.copyFileSync(path.join(root, 'assets', 'bgm.mp4'), path.join(assetsDir, 'bgm.mp4'));
}

// 1. Tải ảnh sản phẩm & TỰ ĐỘNG TÁCH NỀN PHÔNG TRẮNG (Cutout PNG)
const p = job.products?.[0] || {};
const imgSrc = p.image || job.scenes?.[0]?.asset?.src;
if (!imgSrc) throw new Error('Không tìm thấy ảnh sản phẩm');

async function download(urlStr, dest) {
  const res = await fetch(urlStr, { headers: { 'User-Agent': 'lucas-cutout-reel/1.0' } });
  if (!res.ok) throw new Error(`tải ảnh ${res.status}: ${urlStr}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

const localProdImg = path.join(assetsDir, 'product-cutout.png');
console.log(`Tải ảnh sản phẩm ${imgSrc.slice(0, 60)}...`);
await download(imgSrc, localProdImg);

// Tự động tách nền phông trắng -> PNG trong suốt (Cutout)
try {
  console.log('Tự động tách nền phông trắng sản phẩm...');
  execFileSync('python3', [path.join(root, 'scripts', 'remove_white_bg.py'), localProdImg, localProdImg]);
  console.log('✔ Tách nền sản phẩm PNG thành công!');
} catch (e) {
  console.warn('Cảnh báo tách nền Python (dùng ảnh gốc):', e.message);
}

// 2. Chuẩn bị thông tin Text 1, Text 2, Text 3 và Price Sticker
const priceK = Math.round((p.price_vnd || 0) / 1000);
const priceText = p.price_is_from ? `CHỈ TỪ ${priceK}.000₫` : `CHỈ ${priceK}.000₫`;

const scenes = job.scenes || [];
const text1 = (job.title_1 || scenes[0]?.text || scenes[1]?.text || p.name || 'SẢN PHẨM CHÍNH HÃNG').toUpperCase().trim();
const text2 = (job.title_2 || scenes[2]?.text || scenes[1]?.text || 'BẢO VỆ ĐẲNG CẤP').toUpperCase().trim();
const text3 = (job.title_3 || scenes[3]?.text || scenes[4]?.text || 'CHÍNH HÃNG LUCAS.VN').toUpperCase().trim();

// Tự động tính font-size theo độ dài chuỗi để KHÔNG BAO GIỜ bị rớt chữ hay tràn mép
function getFontSize(str, isTitle1 = false) {
  const len = str.length;
  if (isTitle1) {
    if (len <= 25) return '44px';
    if (len <= 45) return '36px';
    return '30px';
  }
  // Title 2 & 3: Ép nằm trên 1 DÒNG DUY NHẤT, tự co font-size để không bị rớt chữ
  if (len <= 18) return '46px';
  if (len <= 26) return '38px';
  if (len <= 34) return '30px';
  return '25px';
}

// 3. Dựng index.html chuẩn Cutout Sheen Motion trong thư mục job
const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        width: 1080px; height: 1920px; overflow: hidden;
        background: #0F172A;
        font-family: 'Be Vietnam Pro', sans-serif;
      }
      #bg { position: absolute; inset: 0; background: #0F172A; }
      #grid {
        position: absolute; inset: 0;
        background-image:
          linear-gradient(rgba(148, 163, 184, 0.12) 2px, transparent 2px),
          linear-gradient(90deg, rgba(148, 163, 184, 0.12) 2px, transparent 2px);
        background-size: 60px 60px;
      }
      #brand-header {
        position: absolute; top: 70px; left: 80px; z-index: 50;
        display: flex; align-items: center; gap: 18px;
        background: #1E293B; border: 2px solid #38BDF8;
        padding: 14px 36px; border-radius: 40px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      }
      #brand-header .logo-img { height: 52px; width: auto; object-fit: contain; }
      #brand-header .title {
        color: #F8FAFC; font-size: 34px; font-weight: 800;
        text-transform: lowercase; letter-spacing: 0.5px;
      }
      .stage {
        position: absolute; inset: 0;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 140px 60px 100px; z-index: 10;
      }
      .cutout-wrapper {
        position: relative;
        width: 760px; height: 760px;
        display: flex; align-items: center; justify-content: center;
        margin-bottom: 24px;
      }
      .cutout-wrapper img.prod-img {
        max-width: 100%; max-height: 100%; object-fit: contain;
        position: relative; z-index: 2;
      }
      .cutout-wrapper .shine-overlay {
        position: absolute; inset: 0; z-index: 5; pointer-events: none;
        -webkit-mask-image: url('assets/product-cutout.png');
        mask-image: url('assets/product-cutout.png');
        -webkit-mask-size: contain; mask-size: contain;
        -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
        -webkit-mask-position: center; mask-position: center;
      }
      .cutout-wrapper .shine-beam {
        position: absolute; top: -60%; left: -60%; width: 50%; height: 220%;
        background: linear-gradient(
          115deg, transparent 0%, rgba(255, 255, 255, 0.0) 30%,
          rgba(255, 255, 255, 0.95) 50%, rgba(255, 255, 255, 0.0) 70%, transparent 100%
        );
        transform: rotate(25deg);
      }
      .text-box {
        font-family: 'Be Vietnam Pro', sans-serif !important;
        font-weight: 800 !important;
        text-transform: uppercase; letter-spacing: -0.5px;
        line-height: 1.25;
        padding: 18px 36px; border-radius: 24px; margin-bottom: 18px;
        text-align: center;
        max-width: 940px;
        width: auto;
        white-space: normal;
        word-break: break-word;
        box-sizing: border-box;
      }
      .text-box-1 { background: #FFFFFF; color: #0F172A; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3); white-space: normal; word-break: break-word; }
      .text-box-2 { background: #38BDF8; color: #0F172A; box-shadow: 0 14px 35px rgba(56, 189, 248, 0.4); white-space: nowrap !important; word-break: keep-all !important; }
      .text-box-3 { background: #10B981; color: #0F172A; box-shadow: 0 14px 35px rgba(16, 185, 129, 0.4); white-space: nowrap !important; word-break: keep-all !important; }
      .price-sticker {
        position: absolute; top: 220px; right: 80px; z-index: 60;
        background: #FACC15; color: #0F172A;
        font-family: 'Be Vietnam Pro', sans-serif;
        font-size: 46px; font-weight: 800;
        padding: 18px 34px; border-radius: 36px;
        transform: rotate(6deg); border: 6px solid #FFFFFF;
        box-shadow: 0 15px 35px rgba(250, 204, 21, 0.4);
      }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="15" data-fps="30" data-width="1080" data-height="1920">
      <div id="bg"></div>
      <div id="grid"></div>
      <audio id="bgm" src="assets/bgm.mp4" autoplay loop></audio>
      <div id="brand-header">
        <img class="logo-img" src="assets/logo.png" alt="Lucas Combo Logo">
        <span class="title">lucas.vn</span>
      </div>
      <div class="price-sticker" id="sticker">${priceText}</div>
      <div class="stage">
        <div class="cutout-wrapper" id="cutout">
          <img class="prod-img" src="assets/product-cutout.png" alt="Sản phẩm">
          <div class="shine-overlay">
            <div class="shine-beam" id="shine"></div>
          </div>
        </div>
        <div class="text-box text-box-1" id="t1" style="font-size: ${getFontSize(text1, true)} !important;">${text1}</div>
        <div class="text-box text-box-2" id="t2" style="font-size: ${getFontSize(text2)} !important;">${text2}</div>
        <div class="text-box text-box-3" id="t3" style="font-size: ${getFontSize(text3)} !important;">${text3}</div>
      </div>
      <script>
        const tl = gsap.timeline({ paused: true });
        tl.from('#cutout', { duration: 0.8, y: 800, scale: 0.5, opacity: 0, ease: 'back.out(1.7)' }, 0.2)
        .fromTo('#shine', { x: -500 }, { duration: 0.65, x: 1300, ease: 'power2.inOut' }, 0.85)
        .from('#sticker', { duration: 0.6, x: 500, rotate: 45, opacity: 0, ease: 'power3.out' }, 0.6)
        .from('#t1', { duration: 0.6, x: -700, opacity: 0, ease: 'power3.out' }, 1.0)
        .from('#t2', { duration: 0.6, x: 700, opacity: 0, ease: 'power3.out' }, 1.8)
        .from('#t3', { duration: 0.6, y: 300, scale: 0.7, opacity: 0, ease: 'back.out(1.5)' }, 2.6)
        .fromTo('#shine', { x: -500 }, { duration: 0.65, x: 1300, ease: 'power2.inOut' }, 4.2)
        .to('#cutout img', { duration: 2.0, scale: 1.08, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 3.2);

        window.__timelines = window.__timelines || {};
        window.__timelines.main = tl;
      </script>
    </div>
  </body>
</html>`;

const indexPath = path.join(jobDir, 'index.html');
fs.writeFileSync(indexPath, html);

// Write hyperframes.json into jobDir
fs.writeFileSync(path.join(jobDir, 'hyperframes.json'), JSON.stringify({
  "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
  "paths": { "assets": "assets" }
}, null, 2));

// 4. Gọi Hyperframes render mp4
const finalMp4 = path.join(jobDir, 'final.mp4');
console.log(`Render Hyperframes Cutout Motion -> ${finalMp4}...`);

execFileSync('npx', [
  '--yes', 'hyperframes@0.7.81', 'render', jobDir,
  '-o', finalMp4, '-f', '30', '-q', 'high'
], { stdio: 'inherit' });

console.log(`Render thành công Cutout Reel: ${finalMp4}`);
