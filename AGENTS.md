# AGENTS.md

Repo sản xuất video ngắn dạng **Sản phẩm Cut-out + Chữ chuyển động & Ánh sáng lướt (Product Cutout & Light Sweep Sheen)** cho **Lucas Combo** (lucas.vn).

## Quy trình sản xuất

1. Tải ảnh sản phẩm từ WooCommerce.
2. Tách nền ảnh tự động thành ảnh PNG Cutout trong suốt (`assets/product-cutout.png`).
3. Lắp mẫu `compositions/main.html` với:
   - Ảnh sản phẩm cutout kích thước lớn (`780px`).
   - Hiệu ứng ánh sáng chéo lướt qua sản phẩm được giới hạn 100% trong khuôn PNG bằng `-webkit-mask-image`.
   - Logo thương hiệu Lucas Combo + tên thương hiệu `lucas.vn` viết thường.
   - 3 dòng chữ chuyển động với font chữ **Be Vietnam Pro** đồng nhất 100% (`52px`, weight `800`).
   - Sticker giá nổi 3D (`CHỈ XXX.000₫`).
4. Render bằng Hyperframes ra file mp4 (`renders/output.mp4`).

## Kiểu dựng đang chạy hằng ngày: painpoint

Từ 2026-08-24, workflow `daily-cutout-reel.yml` render bằng
`scripts/render-painpoint.mjs` (không phải `scripts/render.mjs` nữa).
Khác biệt nằm ở TRÌNH TỰ: câu nỗi đau của khách hiện trước, phóng to giữa màn cho
người xem đọc, nét đỏ gạch ngang từ khoá để phủ định, rồi chữ thu nhỏ dạt lên làm
tiêu đề và sản phẩm cutout mới bật lên. Sau đó chữ và sản phẩm cùng "thở".

- Font câu nỗi đau: **Anton** (kiểm chứng có đủ dấu tiếng Việt), kiểu poster —
  viền dày + bóng cứng đen. Không đổi sang Bebas Neue: font đó THIẾU dấu tiếng Việt.
- `hook.hl` phải có ĐÚNG 1 cụm và nằm nguyên văn trọn trong một dòng `hook.lines`,
  vì nét gạch vẽ bằng cách tách chuỗi theo cụm đó. `gen-scenes.mjs` chặn cứng việc này.
- Bố cục khoá trong dải y 536–1495 (`rules/visual.md`: chữ nằm trong 400–1500,
  chừa 320px đáy cho nút TikTok/Reels). Ảnh sản phẩm ăn `flex:1` nên tự co khi tên
  sản phẩm dài xuống 2 dòng — đừng thay bằng cách đo chiều cao chữ bằng JS, lúc
  script chạy font chưa tải xong nên đo ra số của font dự phòng.

## Lệnh Render

```bash
node scripts/render-painpoint.mjs jobs/<id>.json   # kiểu đang chạy hằng ngày
npm run render                                     # mẫu tĩnh compositions/main
```
