"""
Script to generate authentic road damage and road repair images for JanDrishti demo.
Replaces any placeholder images with realistic asphalt road surfaces:
- Pothole (D00)
- Alligator Cracking (D10)
- Longitudinal Crack (D20)
- Transverse Crack (D40)
- Freshly Paved Asphalt Road (After Repair)
- Hot-Mix Patch Resurfacing (After Repair)
"""

import os
import random
import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

WIDTH = 800
HEIGHT = 520

def create_asphalt_base(width=WIDTH, height=HEIGHT, base_tone=(42, 44, 48), noise_intensity=18):
    """Creates a realistic asphalt base texture with aggregated stone noise."""
    img = Image.new("RGB", (width, height), base_tone)
    pixels = img.load()
    
    for y in range(height):
        for x in range(width):
            noise = random.randint(-noise_intensity, noise_intensity)
            # Occasional speckle of light aggregate or dark tar
            if random.random() < 0.04:
                speckle = random.randint(-35, 35)
            else:
                speckle = 0
            
            r = max(15, min(255, base_tone[0] + noise + speckle))
            g = max(15, min(255, base_tone[1] + noise + speckle))
            b = max(15, min(255, base_tone[2] + noise + speckle))
            pixels[x, y] = (r, g, b)
    
    img = img.filter(ImageFilter.GaussianBlur(radius=0.7))
    return img

def add_road_markings(img, style="yellow_center"):
    """Adds realistic painted road stripes (yellow centerline or white boundary)."""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    
    if style == "yellow_center":
        # Dashed yellow lane stripe down the center
        stripe_w = 14
        dash_len = 90
        gap_len = 50
        y = 0
        while y < h:
            for dx in range(-stripe_w // 2, stripe_w // 2):
                alpha_factor = 1.0 - (abs(dx) / (stripe_w / 1.5))
                c_r = int(225 * alpha_factor + 40 * (1 - alpha_factor))
                c_g = int(175 * alpha_factor + 40 * (1 - alpha_factor))
                c_b = int(35 * alpha_factor + 40 * (1 - alpha_factor))
                draw.line([(w // 2 + dx, y), (w // 2 + dx, min(h, y + dash_len))], fill=(c_r, c_g, c_b), width=1)
            y += dash_len + gap_len
            
    elif style == "white_edge":
        # Solid white edge marking along the left side
        for dx in range(12):
            draw.line([(45 + dx, 0), (45 + dx, h)], fill=(215, 218, 222), width=1)
            
    elif style == "fresh_stripes":
        # Crisp brand-new bright white thermoplastic lane line
        for dx in range(-8, 9):
            fade = 1.0 - (abs(dx) / 10.0)
            col = int(245 * fade + 30 * (1 - fade))
            draw.line([(w // 2 + dx, 0), (w // 2 + dx, h)], fill=(col, col, col), width=1)
            
    return img

def generate_pothole_image():
    """Generates D00: Severe Road Pothole with depth shadow and broken aggregate."""
    img = create_asphalt_base(base_tone=(48, 50, 54), noise_intensity=22)
    img = add_road_markings(img, "yellow_center")
    draw = ImageDraw.Draw(img)
    w, h = img.size
    
    # Pothole center and radius
    cx, cy = w // 2 - 30, h // 2 + 20
    rx, ry = 145, 95
    
    # Generate jagged perimeter points
    num_points = 36
    points = []
    for i in range(num_points):
        angle = (2 * math.pi * i) / num_points
        dist_var = random.uniform(0.78, 1.25)
        px = cx + int(rx * math.cos(angle) * dist_var)
        py = cy + int(ry * math.sin(angle) * dist_var)
        points.append((px, py))
    
    # Outer eroded ring (broken distressed asphalt)
    for i in range(len(points)):
        p1 = points[i]
        p2 = points[(i + 1) % len(points)]
        draw.line([p1, p2], fill=(22, 23, 26), width=10)
        
    # Inner dark depression
    draw.polygon(points, fill=(18, 19, 21))
    
    # Deep cavity shadow (gives 3D depth)
    inner_shadow = []
    for (px, py) in points:
        ix = int(cx + (px - cx) * 0.72)
        iy = int(cy + (py - cy) * 0.72 + 10)
        inner_shadow.append((ix, iy))
    draw.polygon(inner_shadow, fill=(9, 10, 12))
    
    # Loose gravel and stones inside the cavity
    for _ in range(120):
        gx = cx + random.randint(-rx + 25, rx - 25)
        gy = cy + random.randint(-ry + 20, ry - 15)
        stone_size = random.randint(2, 6)
        stone_col = random.choice([(70, 72, 75), (95, 98, 102), (55, 57, 60), (35, 36, 38)])
        draw.ellipse([gx, gy, gx + stone_size, gy + stone_size], fill=stone_col)
        
    # Micro radial cracks extending outward from the pothole rim
    for i in range(8):
        angle = (2 * math.pi * i) / 8 + random.uniform(-0.2, 0.2)
        start_x = cx + int(rx * 1.05 * math.cos(angle))
        start_y = cy + int(ry * 1.05 * math.sin(angle))
        crack_len = random.randint(30, 85)
        curr_x, curr_y = start_x, start_y
        for _ in range(8):
            next_x = curr_x + int(math.cos(angle) * (crack_len / 8) + random.randint(-5, 5))
            next_y = curr_y + int(math.sin(angle) * (crack_len / 8) + random.randint(-5, 5))
            draw.line([(curr_x, curr_y), (next_x, next_y)], fill=(15, 16, 18), width=2)
            curr_x, curr_y = next_x, next_y

    return img

def generate_alligator_cracking_image():
    """Generates D10: Alligator / Fatigue Cracking (interconnected polygonal crack grid)."""
    img = create_asphalt_base(base_tone=(44, 46, 50), noise_intensity=20)
    img = add_road_markings(img, "yellow_center")
    draw = ImageDraw.Draw(img)
    w, h = img.size
    
    # Grid of seed points for crocodile/alligator pattern
    seeds = []
    zone_x_min, zone_x_max = 120, w - 120
    zone_y_min, zone_y_max = 80, h - 80
    
    cols, rows = 9, 7
    for c in range(cols):
        for r in range(rows):
            sx = zone_x_min + int(c * (zone_x_max - zone_x_min) / cols) + random.randint(-22, 22)
            sy = zone_y_min + int(r * (zone_y_max - zone_y_min) / rows) + random.randint(-18, 18)
            seeds.append((sx, sy))
            
    # Connect nearby seeds to create polygonal network
    for i, s1 in enumerate(seeds):
        # find 3 closest neighbors
        neighbors = sorted(seeds, key=lambda s: (s[0]-s1[0])**2 + (s[1]-s1[1])**2)[1:4]
        for s2 in neighbors:
            # draw jagged crack line between s1 and s2
            steps = 5
            cur_x, cur_y = s1
            for step in range(1, steps + 1):
                tx = int(s1[0] + (s2[0] - s1[0]) * (step / steps) + random.randint(-4, 4))
                ty = int(s1[1] + (s2[1] - s1[1]) * (step / steps) + random.randint(-4, 4))
                draw.line([(cur_x, cur_y), (tx, ty)], fill=(12, 13, 15), width=random.choice([2, 3]))
                cur_x, cur_y = tx, ty
                
    # Eroded edges & loose dust along cracks
    for _ in range(80):
        dx = random.randint(zone_x_min, zone_x_max)
        dy = random.randint(zone_y_min, zone_y_max)
        draw.point((dx, dy), fill=(25, 27, 30))
        
    return img

def generate_longitudinal_crack_image():
    """Generates D20: Longitudinal Crack running parallel along wheel-path."""
    img = create_asphalt_base(base_tone=(46, 48, 52), noise_intensity=18)
    img = add_road_markings(img, "white_edge")
    draw = ImageDraw.Draw(img)
    w, h = img.size
    
    # Continuous vertical crack along lane wheel-path (x around 320-360)
    cur_x = 340
    for y in range(0, h, 12):
        next_x = cur_x + random.randint(-6, 6)
        next_x = max(280, min(420, next_x))
        # Main crack
        draw.line([(cur_x, y), (next_x, y + 12)], fill=(10, 11, 13), width=random.choice([3, 4]))
        
        # Branching micro-cracks
        if random.random() < 0.28:
            branch_len = random.randint(25, 65)
            angle = random.choice([-0.7, 0.7, -1.2, 1.2])
            bx2 = cur_x + int(math.cos(angle) * branch_len)
            by2 = y + int(math.sin(angle) * branch_len)
            draw.line([(cur_x, y), (bx2, by2)], fill=(16, 17, 20), width=2)
            
        cur_x = next_x
        
    return img

def generate_transverse_crack_image():
    """Generates D40: Transverse Crack stretching across the road width."""
    img = create_asphalt_base(base_tone=(45, 47, 51), noise_intensity=19)
    img = add_road_markings(img, "yellow_center")
    draw = ImageDraw.Draw(img)
    w, h = img.size
    
    # Horizontal transverse fracture at y ~ 260
    cur_y = 260
    for x in range(30, w - 30, 15):
        next_y = cur_y + random.randint(-5, 5)
        next_y = max(210, min(310, next_y))
        draw.line([(x, cur_y), (x + 15, next_y)], fill=(11, 12, 14), width=random.choice([3, 5]))
        
        # Secondary spall fractures
        if random.random() < 0.3:
            draw.line([(x, cur_y), (x + random.randint(-10, 10), cur_y + random.randint(-35, 35))],
                      fill=(18, 19, 22), width=2)
        cur_y = next_y
        
    return img

def generate_repaired_fresh_asphalt_image():
    """Generates Post-Repair: Smooth, pristine, freshly resurfaced dark asphalt."""
    # Dark uniform freshly laid bitumen
    img = create_asphalt_base(base_tone=(28, 30, 33), noise_intensity=10)
    img = add_road_markings(img, "fresh_stripes")
    draw = ImageDraw.Draw(img)
    w, h = img.size
    
    # Compaction roller roller lines (subtle sheen parallel to road)
    for rx in range(120, w, 160):
        for y in range(0, h, 4):
            val = random.randint(-3, 3)
            draw.line([(rx, y), (rx + 60, y)], fill=(32 + val, 34 + val, 37 + val), width=1)
            
    return img

def generate_repaired_patch_image():
    """Generates Post-Repair: Compacted hot-mix bituminous rectangular patch."""
    img = create_asphalt_base(base_tone=(46, 48, 52), noise_intensity=18)
    img = add_road_markings(img, "yellow_center")
    draw = ImageDraw.Draw(img)
    w, h = img.size
    
    # Rectangular milled and filled patch area
    px1, py1 = w // 2 - 130, h // 2 - 65
    px2, py2 = w // 2 + 110, h // 2 + 75
    
    # Fresh darker asphalt fill
    for y in range(py1, py2):
        for x in range(px1, px2):
            n = random.randint(-8, 8)
            draw.point((x, y), fill=(26 + n, 28 + n, 31 + n))
            
    # Tar-sealed edges (black bituminous sealant line around perimeter)
    draw.rectangle([px1, py1, px2, py2], outline=(10, 11, 12), width=4)
    
    # Roller compaction tracks inside the patch
    for py in range(py1 + 10, py2 - 10, 25):
        draw.line([(px1 + 10, py), (px2 - 10, py)], fill=(33, 35, 38), width=3)
        
    return img

def main():
    target_dirs = [
        "backend/uploads",
        "frontend/public/images/roads"
    ]
    for d in target_dirs:
        os.makedirs(d, exist_ok=True)
        
    images_to_generate = [
        ("road_pothole_d00.jpg", generate_pothole_image()),
        ("road_alligator_d10.jpg", generate_alligator_cracking_image()),
        ("road_longitudinal_d20.jpg", generate_longitudinal_crack_image()),
        ("road_transverse_d40.jpg", generate_transverse_crack_image()),
        ("road_repaired_fresh_asphalt.jpg", generate_repaired_fresh_asphalt_image()),
        ("road_repaired_patch.jpg", generate_repaired_patch_image()),
    ]
    
    for filename, img in images_to_generate:
        for d in target_dirs:
            out_path = os.path.join(d, filename)
            img.save(out_path, quality=92)
            print(f"Generated: {out_path} ({img.size[0]}x{img.size[1]})")

if __name__ == "__main__":
    main()

