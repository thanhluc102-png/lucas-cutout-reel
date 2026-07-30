# AGENTS.md

Repo sản xuất video ngắn dạng **Sản phẩm Cut-out + Chữ chuyển động & Ánh sáng lướt (Product Cutout & Light Sweep Sheen)** cho **Lucas Combo Plus** (lucas.vn).

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

## Lệnh Render

```bash
npm run render
```
