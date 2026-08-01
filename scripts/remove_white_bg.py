#!/usr/bin/env python3
import sys
from PIL import Image
import numpy as np

def remove_bg(image_path, output_path):
    """
    Tự động tách phông nền sản phẩm (Cutout PNG).
    Ưu tiên 1: Dùng AI rembg (xóa phông cực sạch cho MỌI ảnh: ngoài trời, bàn gỗ, bối cảnh phức tạp).
    Ưu tiên 2: Dùng thuật toán Floodfill thông minh (loang vết viền phông trắng/studio).
    """
    # 1. Thử tách nền bằng AI (rembg)
    try:
        from rembg import remove
        img = Image.open(image_path).convert("RGBA")
        out = remove(img)
        out.save(output_path, "PNG")
        print("✔ Tách nền AI (rembg) thành công!")
        return
    except Exception as e:
        print(f"Cảnh báo AI rembg ({e}), chuyển sang thuật toán Floodfill...", file=sys.stderr)

    # 2. Dự phòng: Floodfill thông minh cho phông trắng / studio
    remove_bg_floodfill(image_path, output_path)

def remove_bg_floodfill(image_path, output_path, max_tolerance=45):
    img = Image.open(image_path).convert("RGBA")
    arr = np.array(img, dtype=np.int16)
    height, width, _ = arr.shape

    # Lấy dải pixel 4 cạnh viền ngoài
    border_pixels = []
    border_pixels.extend(arr[0:5, :, :3].reshape(-1, 3))
    border_pixels.extend(arr[-5:, :, :3].reshape(-1, 3))
    border_pixels.extend(arr[:, 0:5, :3].reshape(-1, 3))
    border_pixels.extend(arr[:, -5:, :3].reshape(-1, 3))
    border_pixels = np.array(border_pixels)

    bg_color = np.median(border_pixels, axis=0)
    bg_luminance = np.mean(bg_color)

    diff = np.abs(arr[:, :, :3] - bg_color)
    is_near_bg = np.all(diff <= max_tolerance, axis=2)

    if bg_luminance > 170:
        is_bright = (arr[:, :, 0] > 200) & (arr[:, :, 1] > 200) & (arr[:, :, 2] > 200)
        is_bg = is_near_bg | is_bright
    else:
        is_bg = is_near_bg

    visited = np.zeros((height, width), dtype=bool)
    queue = []

    for x in range(width):
        if is_bg[0, x]: queue.append((0, x)); visited[0, x] = True
        if is_bg[height-1, x]: queue.append((height-1, x)); visited[height-1, x] = True
    for y in range(height):
        if is_bg[y, 0]: queue.append((y, 0)); visited[y, 0] = True
        if is_bg[y, width-1]: queue.append((y, width-1)); visited[y, width-1] = True

    head = 0
    while head < len(queue):
        cy, cx = queue[head]
        head += 1
        for dy, dx in ((-1,0), (1,0), (0,-1), (0,1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < height and 0 <= nx < width and not visited[ny, nx]:
                if is_bg[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))

    arr_out = np.array(img)
    arr_out[visited, 3] = 0
    result = Image.fromarray(arr_out, "RGBA")
    result.save(output_path, "PNG")
    print("✔ Tách nền Floodfill thành công!")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        remove_bg(sys.argv[1], sys.argv[2])
    elif len(sys.argv) > 1:
        remove_bg(sys.argv[1], sys.argv[1])
