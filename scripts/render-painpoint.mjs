#!/usr/bin/env node
/**
 * RENDER PAINPOINT CUTOUT — biến thể của render.mjs.
 *
 *   node scripts/render-painpoint.mjs jobs/<id>.json
 *   -> jobs/<id>/final.mp4
 *
 * Khác render.mjs ở TRÌNH TỰ dựng: câu nỗi đau của khách hiện ra TRƯỚC, phóng to
 * giữa màn cho người xem đọc, rồi thu nhỏ dạt lên đỉnh làm tiêu đề; sản phẩm
 * cutout mới bật lên sau. Từ đó cả chữ lẫn sản phẩm cùng "thở" (zoom ra/vào).
 * Pipeline tách nền PNG + tia sáng lướt giữ nguyên như bản cutout gốc.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const file = process.argv[2];
if (!file) {
  console.error('Dùng: node scripts/render-painpoint.mjs jobs/<id>.json');
  process.exit(2);
}

const job = JSON.parse(fs.readFileSync(file, 'utf8'));
const jobDir = path.join(path.dirname(file), path.basename(file, '.json'));
const assetsDir = path.join(jobDir, 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

if (fs.existsSync(path.join(root, 'assets', 'logo.png'))) {
  fs.copyFileSync(path.join(root, 'assets', 'logo.png'), path.join(assetsDir, 'logo.png'));
}
if (fs.existsSync(path.join(root, 'assets', 'bgm.mp4'))) {
  fs.copyFileSync(path.join(root, 'assets', 'bgm.mp4'), path.join(assetsDir, 'bgm.mp4'));
}

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

try {
  console.log('Tự động tách nền phông trắng sản phẩm...');
  execFileSync('python3', [path.join(root, 'scripts', 'remove_white_bg.py'), localProdImg, localProdImg]);
  console.log('✔ Tách nền sản phẩm PNG thành công!');
} catch (e) {
  console.warn('Cảnh báo tách nền Python (dùng ảnh gốc):', e.message);
}

function formatVnPrice(priceVnd, isFrom = false) {
  if (!priceVnd || priceVnd <= 0) return 'CHÍNH HÃNG';
  const formatted = priceVnd.toLocaleString('vi-VN').replace(/,/g, '.');
  return isFrom ? `CHỈ TỪ ${formatted}₫` : `CHỈ ${formatted}₫`;
}

const priceText = formatVnPrice(p.price_vnd, p.price_is_from);

function cleanText(str, defaultText = '') {
  if (!str) return defaultText;
  return str.replace(/[.,!?:;]/g, '').trim().toUpperCase();
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const scenes = job.scenes || [];
const text1 = (p.name || job.title_1 || 'SẢN PHẨM CHÍNH HÃNG').toUpperCase().trim();
const text2 = cleanText(job.title_2 || scenes[2]?.text || scenes[1]?.text || 'BẢO VỆ ĐẲNG CẤP');
const text3 = cleanText(job.title_3 || scenes[3]?.text || scenes[4]?.text || 'CHÍNH HÃNG LUCAS.VN');

// Câu nỗi đau: ưu tiên hook.lines (gen-scenes đã tách dòng sẵn), rồi tới cảnh hook.
const painLines = job.hook?.lines?.length ? job.hook.lines : [scenes[0]?.text || 'Bạn đang gặp vấn đề này?'];
const painPlain = painLines.join(' ');

// Nhấn từ khoá: đổi màu + gạch ngang phủ định nỗi đau. Màu #FF5460 lấy đúng
// theo quy ước có sẵn của repo (#strike trong templates/hook.html), không đặt màu mới.
const painHtml = painLines
  .map((ln) => {
    let out = esc(ln);
    for (const h of job.hook?.hl || [])
      out = out.split(esc(h)).join(`<span class="hi">${esc(h)}<i class="strike-line"></i></span>`);
    return out;
  })
  .join('<br>');

function getFontSize(str, isTitle1 = false) {
  const len = str.length;
  if (isTitle1) {
    if (len <= 25) return '44px';
    if (len <= 45) return '34px';
    return '28px';
  }
  if (len <= 20) return '42px';
  if (len <= 30) return '34px';
  if (len <= 42) return '28px';
  return '24px';
}

// Chữ nỗi đau đặt cỡ LỚN sẵn rồi thu nhỏ bằng transform — thu nhỏ luôn nét,
// phóng to từ cỡ nhỏ thì chữ bị nhoè. Cỡ nhỉnh hơn bản Be Vietnam Pro vì Anton
// là font nén ngang, cùng số pixel thì chiếm ít bề ngang hơn.
function getPainFontSize(str) {
  const len = str.length;
  if (len <= 28) return '118px';
  if (len <= 44) return '100px';
  if (len <= 62) return '84px';
  return '72px';
}

// Bố cục dọc, bám dải an toàn của rules/visual.md: chữ và giá nằm trong y 400–1500,
// chừa 320px đáy cho nút TikTok/Reels. Xếp kín dải đó để khung hình không bị hẫng:
//   chữ nỗi đau đậu   400 – 496   (neo MÉP DƯỚI ở 496, xem PAIN_DOCK_BOTTOM)
//   ảnh sản phẩm      536 – 1236
//   3 dòng chữ        1264 – 1495
const PAIN_DOCK_BOTTOM = 496;
const PAIN_DOCK_SCALE = 0.5;
const STAGE_PAD_TOP = 536;
const BAND_BOTTOM = 1495;   // đáy dải an toàn cho chữ (rules/visual.md: 400–1500)
const CUTOUT_SIZE = 700;    // cỡ ảnh tối đa, dùng khi tên sản phẩm ngắn gọn 1 dòng
const CUTOUT_MIN = 520;     // co hết cỡ vẫn phải đủ to để nhìn ra sản phẩm
const CUTOUT_GAP_BOTTOM = 28;

const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,700;0,800;0,900;1,700;1,800;1,900&family=Anton&display=swap" rel="stylesheet">
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
      /* Chữ nỗi đau: neo giữa khung, GSAP lo phần phóng to / thu nhỏ / dạt lên.
         Kiểu poster = viền dày quanh chữ + bóng đổ CỨNG (không blur) lệch một góc.
         paint-order:stroke fill đẩy viền ra sau phần ruột chữ, nếu không viền sẽ
         ăn lẹm vào nét và Anton vốn đã nén ngang sẽ bị bít lỗ chữ. */
      #pain {
        position: absolute; top: 50%; left: 50%; z-index: 40;
        width: 940px; text-align: center;
        font-family: 'Anton', 'Be Vietnam Pro', sans-serif;
        font-weight: 400; line-height: 1.14; letter-spacing: 0.5px;
        color: #FFFFFF;
        -webkit-text-stroke: 9px #0A1020;
        paint-order: stroke fill;
        /* Bóng cứng (không blur) phải là ĐEN TUYỀN mới nổi trên nền #0F172A —
           bóng cùng tông navy thì chìm hẳn. Quầng sáng thứ hai tách khối chữ
           khỏi nền lưới, không thì chữ dính vào các đường kẻ. */
        text-shadow: 12px 13px 0 #000000, 0 0 60px rgba(56, 189, 248, 0.5);
        font-size: ${getPainFontSize(painPlain)};
      }
      #pain .hi { color: #38BDF8; position: relative; display: inline-block; }
      #pain .hi .strike-line {
        position: absolute; left: -0.05em; right: -0.05em; top: 50%;
        height: 0.13em; margin-top: -0.065em; border-radius: 0.06em;
        background: #FF5460; box-shadow: 4px 5px 0 #0A1020;
        transform: scaleX(0); transform-origin: left center;
      }
      /* Khung dựng CHỐT đúng dải ${STAGE_PAD_TOP}–${BAND_BOTTOM}: mép trên là chỗ chữ nỗi
         đau vừa đậu xong, mép dưới là giới hạn an toàn của rules/visual.md. Ảnh sản
         phẩm ăn flex:1 nên TỰ co phần dư — tên sản phẩm dài xuống 2 dòng thì ảnh nhỏ
         lại, đáy chữ vẫn đứng yên ở ${BAND_BOTTOM}. Chốt bằng CSS chứ không đo bằng JS
         vì lúc script chạy font chưa tải xong, đo ra chiều cao của font dự phòng
         (đã dính: job cáp LISEN đo hụt 35px, đáy tràn xuống 1530). */
      .stage {
        position: absolute; left: 0; right: 0;
        top: ${STAGE_PAD_TOP}px; bottom: ${1920 - BAND_BOTTOM}px;
        display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
        padding: 0 60px; z-index: 10;
      }
      .cutout-wrapper {
        position: relative;
        flex: 1 1 auto; min-height: ${CUTOUT_MIN}px;
        width: ${CUTOUT_SIZE}px; max-height: ${CUTOUT_SIZE}px;
        display: flex; align-items: center; justify-content: center;
        margin-bottom: ${CUTOUT_GAP_BOTTOM}px;
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
        flex: 0 0 auto;
        font-family: 'Be Vietnam Pro', sans-serif !important;
        font-weight: 800 !important;
        text-transform: uppercase; letter-spacing: -0.5px;
        line-height: 1.25;
        padding: 16px 32px; border-radius: 24px; margin-bottom: 16px;
        text-align: center;
        width: 920px;
        box-sizing: border-box;
      }
      .text-box-1 { background: #FFFFFF; color: #0F172A; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3); width: 920px; white-space: normal; word-break: keep-all; overflow-wrap: break-word; }
      .text-box-2 { background: #38BDF8; color: #0F172A; box-shadow: 0 14px 35px rgba(56, 189, 248, 0.4); max-width: 920px; width: auto; white-space: normal; word-break: keep-all; overflow-wrap: break-word; }
      .text-box:last-child { margin-bottom: 0; }
      .text-box-3 { background: #10B981; color: #0F172A; box-shadow: 0 14px 35px rgba(16, 185, 129, 0.4); max-width: 920px; width: auto; white-space: normal; word-break: keep-all; overflow-wrap: break-word; }
      .price-sticker {
        position: absolute; top: 250px; right: 70px; z-index: 60;
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
      <div id="pain">${painHtml}</div>
      <div class="price-sticker" id="sticker">${esc(priceText)}</div>
      <div class="stage">
        <div class="cutout-wrapper" id="cutout">
          <img class="prod-img" src="assets/product-cutout.png" alt="Sản phẩm">
          <div class="shine-overlay">
            <div class="shine-beam" id="shine"></div>
          </div>
        </div>
        <div class="text-box text-box-1" id="t1" style="font-size: ${getFontSize(text1, true)} !important;">${esc(text1)}</div>
        <div class="text-box text-box-2" id="t2" style="font-size: ${getFontSize(text2)} !important;">${esc(text2)}</div>
        <div class="text-box text-box-3" id="t3" style="font-size: ${getFontSize(text3)} !important;">${esc(text3)}</div>
      </div>
      <script>
        gsap.set('#pain', { xPercent: -50, yPercent: -50 });

        // Chữ nỗi đau neo giữa khung (tâm y=960). Khi đậu, nó co về ${PAIN_DOCK_SCALE}
        // quanh tâm nên nửa chiều cao còn h*${PAIN_DOCK_SCALE}/2. Tính y để MÉP DƯỚI
        // luôn nằm đúng ${PAIN_DOCK_BOTTOM} — neo mép dưới chứ không neo tâm, để hook
        // 3 dòng cũng giữ nguyên khoảng hở với ảnh sản phẩm bên dưới thay vì đè lên.
        const painEl = document.getElementById('pain');
        const PAIN_DOCK_SCALE = ${PAIN_DOCK_SCALE};
        const PAIN_DOCK_Y =
          ${PAIN_DOCK_BOTTOM} - 960 - painEl.offsetHeight * PAIN_DOCK_SCALE / 2;


        const tl = gsap.timeline({ paused: true });
        // 1. Nỗi đau bung to giữa màn, giữ nhịp tới 1.95s cho người xem đọc kịp.
        tl.fromTo('#pain', { scale: 0.45, opacity: 0 },
                           { duration: 0.75, scale: 1, opacity: 1, ease: 'back.out(1.4)' }, 0.15)
        // 2. Thu nhỏ + dạt lên đỉnh, hoá thành tiêu đề.
        .to('#pain', { duration: 0.85, scale: PAIN_DOCK_SCALE, y: PAIN_DOCK_Y, ease: 'power3.inOut' }, 1.95)
        // 3. Sản phẩm cutout bật lên chỗ vừa trống ra.
        .from('#cutout', { duration: 0.8, y: 700, scale: 0.5, opacity: 0, ease: 'back.out(1.6)' }, 2.6)
        .from('#sticker', { duration: 0.6, x: 500, rotate: 45, opacity: 0, ease: 'power3.out' }, 3.1)
        .fromTo('#shine', { x: -500 }, { duration: 0.65, x: 1300, ease: 'power2.inOut' }, 3.3)
        .from('#t1', { duration: 0.6, x: -700, opacity: 0, ease: 'power3.out' }, 3.6)
        .from('#t2', { duration: 0.6, x: 700, opacity: 0, ease: 'power3.out' }, 4.3)
        .from('#t3', { duration: 0.6, y: 300, scale: 0.7, opacity: 0, ease: 'back.out(1.5)' }, 5.0)
        // 4. Cả chữ lẫn sản phẩm cùng thở — lệch chu kỳ để khung hình không "đập" cùng nhịp.
        .to('#cutout .prod-img', { duration: 2.0, scale: 1.08, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 5.8)
        .to('#pain', { duration: 2.4, scale: PAIN_DOCK_SCALE + 0.045, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 5.8)
        .fromTo('#shine', { x: -500 }, { duration: 0.65, x: 1300, ease: 'power2.inOut' }, 9.5);

        // Nét gạch kéo ngang phủ định nỗi đau, kết thúc đúng lúc chữ bắt đầu thu nhỏ.
        tl.to('#pain .strike-line', { duration: 0.4, scaleX: 1, ease: 'power2.out' }, 1.55);

        window.__timelines = window.__timelines || {};
        window.__timelines.main = tl;
      </script>
    </div>
  </body>
</html>`;

fs.writeFileSync(path.join(jobDir, 'index.html'), html);

fs.writeFileSync(path.join(jobDir, 'hyperframes.json'), JSON.stringify({
  "$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
  "paths": { "assets": "assets" }
}, null, 2));

const finalMp4 = path.join(jobDir, 'final.mp4');
console.log(`Render Hyperframes Painpoint Cutout -> ${finalMp4}...`);

execFileSync('npx', [
  '--yes', 'hyperframes@0.7.81', 'render', jobDir,
  '-o', finalMp4, '-f', '30', '-q', 'high'
], { stdio: 'inherit' });

console.log(`Render thành công Painpoint Cutout Reel: ${finalMp4}`);
