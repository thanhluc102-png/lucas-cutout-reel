#!/usr/bin/env python3
import sys
from PIL import Image
import numpy as np

def remove_bg_floodfill(image_path, output_path, tolerance=35):
    """
    Floodfill từ 4 cạnh ngoài của ảnh sản phẩm để xoá phông trắng/sáng studio.
    Biến phông nền ngoài thành PNG trong suốt (Cutout), giữ nguyên nội dung sản phẩm bên trong.
    """
    img = Image.open(image_path).convert("RGBA")
    arr = np.array(img, dtype=np.int16)
    height, width, _ = arr.shape

    # Lấy màu phông nền từ 4 góc ảnh
    corners = [arr[0, 0, :3], arr[0, width-1, :3], arr[height-1, 0, :3], arr[height-1, width-1, :3]]
    bg_color = np.mean(corners, axis=0)

    # Đo khoảng cách màu so với phông nền
    diff = np.abs(arr[:, :, :3] - bg_color)
    is_bg_color = np.all(diff <= tolerance, axis=2)

    # Loang vết (BFS Floodfill) từ 4 cạnh ngoài vào trong
    visited = np.zeros((height, width), dtype=bool)
    queue = []

    for x in range(width):
        if is_bg_color[0, x]: queue.append((0, x)); visited[0, x] = True
        if is_bg_color[height-1, x]: queue.append((height-1, x)); visited[height-1, x] = True
    for y in range(height):
        if is_bg_color[y, 0]: queue.append((y, 0)); visited[y, 0] = True
        if is_bg_color[y, width-1]: queue.append((y, width-1)); visited[y, width-1] = True

    head = 0
    while head < len(queue):
        cy, cx = queue[head]
        head += 1

        for dy, dx in ((-1,0), (1,0), (0,-1), (0,1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < height and 0 <= nx < width and not visited[ny, nx]:
                if is_bg_color[ny, nx]:
                    visited[ny, nx] = True
                    queue.append((ny, nx))

    # Gán alpha = 0 cho các điểm ảnh thuộc phông nền ngoài
    arr_out = np.array(img)
    arr_out[visited, 3] = 0

    result = Image.fromarray(arr_out, "RGBA")
    result.save(output_path, "PNG")

if __name__ == "__main__":
    if len(sys.argv) > 2:
        remove_bg_floodfill(sys.argv[1], sys.argv[2])
    elif len(sys.argv) > 1:
        remove_bg_floodfill(sys.argv[1], sys.argv[1])
