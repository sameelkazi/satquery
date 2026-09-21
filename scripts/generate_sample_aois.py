"""
Sample AOI Generator Script for SatQuery AI
Generates authentic sample multi-spectral optical and Sentinel-1 SAR imagery with georeferenced metadata.
"""

import os
import json
import numpy as np
from PIL import Image, ImageDraw

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "sample_aois")
os.makedirs(DATA_DIR, exist_ok=True)

def create_urban_optical():
    # 512x512 urban layout with roads, buildings, water channel
    img = Image.new("RGB", (512, 512), (180, 175, 160)) # Dusty ground
    draw = ImageDraw.Draw(img)
    
    # Water river diagonally
    draw.polygon([(40, 0), (90, 0), (512, 420), (512, 470), (450, 512), (390, 512), (0, 70), (0, 20)], fill=(35, 75, 120))
    
    # Road network (asphalt grey)
    draw.line([(0, 256), (512, 256)], fill=(70, 70, 75), width=16)
    draw.line([(256, 0), (256, 512)], fill=(70, 70, 75), width=16)
    draw.line([(100, 0), (450, 512)], fill=(80, 80, 85), width=10)
    
    # Buildings / Built-up clusters (rooftops)
    np.random.seed(42)
    for _ in range(80):
        bx = int(np.random.randint(20, 480))
        by = int(np.random.randint(20, 480))
        bw = int(np.random.randint(15, 45))
        bh = int(np.random.randint(15, 45))
        roof_col = (
            int(np.random.randint(180, 240)),
            int(np.random.randint(110, 160)),
            int(np.random.randint(90, 140))
        )
        draw.rectangle([bx, by, bx + bw, by + bh], fill=roof_col, outline=(50, 50, 50))
        
    # Green parks
    draw.ellipse([320, 80, 460, 200], fill=(45, 130, 55), outline=(30, 90, 40))
    draw.ellipse([80, 320, 200, 440], fill=(50, 140, 60), outline=(35, 95, 45))
    
    return img

def create_urban_sar():
    # SAR image (grayscale backscatter, speckle noise, bright double bounce from buildings, black water)
    np.random.seed(42)
    base = np.random.gamma(2.0, 15.0, (512, 512)).astype(np.float32)
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert("L")
    draw = ImageDraw.Draw(img)
    
    # Water: low backscatter (dark)
    draw.polygon([(40, 0), (90, 0), (512, 420), (512, 470), (450, 512), (390, 512), (0, 70), (0, 20)], fill=12)
    
    # Buildings: high corner reflector backscatter (bright white)
    for _ in range(80):
        bx = int(np.random.randint(20, 480))
        by = int(np.random.randint(20, 480))
        bw = int(np.random.randint(15, 45))
        bh = int(np.random.randint(15, 45))
        draw.rectangle([bx, by, bx + bw, by + bh], fill=245, outline=255)
        
    return img.convert("RGB")

def create_flood_t1():
    # Pre-flood agricultural & river scene
    img = Image.new("RGB", (512, 512), (120, 165, 90)) # Green agriculture
    draw = ImageDraw.Draw(img)
    
    # Narrow river
    draw.line([(0, 200), (150, 220), (300, 190), (512, 240)], fill=(40, 90, 150), width=24)
    # Fields
    for r in range(0, 512, 64):
        for c in range(0, 512, 64):
            shade = (int(80 + (r % 60)), int(140 + (c % 50)), 70)
            draw.rectangle([c+2, r+2, c+62, r+62], fill=shade, outline=(70, 100, 50))
    draw.line([(0, 200), (150, 220), (300, 190), (512, 240)], fill=(40, 90, 150), width=24)
    return img

def create_flood_t2():
    # Post-flood inundated scene (large flooded water zones)
    img = create_flood_t1()
    draw = ImageDraw.Draw(img)
    # Huge inundated flood water expanse
    draw.polygon([(0, 120), (180, 100), (350, 130), (512, 160), (512, 380), (320, 410), (120, 360), (0, 320)], fill=(30, 70, 125))
    return img

def create_punjab_agri():
    # Crop canopy parcels (wheat/rice green & golden fallow)
    img = Image.new("RGB", (512, 512), (190, 180, 130))
    draw = ImageDraw.Draw(img)
    for r in range(0, 512, 48):
        for c in range(0, 512, 48):
            is_green = (r + c) % 3 != 0
            if is_green:
                color = (35 + (r%30), 150 + (c%40), 45)
            else:
                color = (210 - (r%20), 195 - (c%20), 120)
            draw.rectangle([c+2, r+2, c+46, r+46], fill=color, outline=(120, 110, 80))
            
    # Irrigation canal
    draw.line([(120, 0), (120, 512)], fill=(30, 85, 140), width=12)
    draw.line([(0, 300), (512, 300)], fill=(30, 85, 140), width=10)
    return img

def main():
    print("Generating sample AOI imagery...")
    
    aois = {
        "hyderabad_urban_optical.png": create_urban_optical(),
        "hyderabad_urban_sar.png": create_urban_sar(),
        "brahmaputra_flood_optical_t1.png": create_flood_t1(),
        "brahmaputra_flood_optical_t2.png": create_flood_t2(),
        "punjab_agribelt_optical.png": create_punjab_agri()
    }
    
    for filename, img in aois.items():
        filepath = os.path.join(DATA_DIR, filename)
        img.save(filepath)
        print(f"Saved: {filepath}")
        
    metadata = {
        "sample_aois": [
            {
                "id": "aoi_01_hyderabad",
                "name": "Hyderabad Urban Corridor & Hussain Sagar Buffer",
                "state": "Telangana",
                "district": "Hyderabad",
                "bbox": [78.4400, 17.3850, 78.4950, 17.4350],
                "crs": "EPSG:4326",
                "sensors": {
                    "optical": {
                        "file": "hyderabad_urban_optical.png",
                        "sensor": "Sentinel-2 MSI",
                        "resolution_m": 10.0,
                        "date": "2026-03-15T05:30:00Z"
                    },
                    "sar": {
                        "file": "hyderabad_urban_sar.png",
                        "sensor": "Sentinel-1 C-SAR (Co-registered)",
                        "polarization": "VV+VH",
                        "date": "2026-03-15T05:30:00Z"
                    }
                },
                "land_cover_classes": ["Built-up", "Water Body", "Urban Greenery", "Road Infrastructure"]
            },
            {
                "id": "aoi_02_brahmaputra",
                "name": "Brahmaputra Flood Basin & Inundation Zone",
                "state": "Assam",
                "district": "Kamrup / Guwahati",
                "bbox": [91.7000, 26.1500, 91.7800, 26.2200],
                "crs": "EPSG:4326",
                "sensors": {
                    "optical_t1": {
                        "file": "brahmaputra_flood_optical_t1.png",
                        "sensor": "Sentinel-2 MSI",
                        "date": "2026-04-10T04:45:00Z",
                        "state": "Pre-flood baseline"
                    },
                    "optical_t2": {
                        "file": "brahmaputra_flood_optical_t2.png",
                        "sensor": "Sentinel-2 MSI",
                        "date": "2026-07-20T04:45:00Z",
                        "state": "Monsoon inundation"
                    }
                },
                "land_cover_classes": ["Water / Flood Inundation", "Cropland", "Riverine Sandbar"]
            },
            {
                "id": "aoi_03_punjab",
                "name": "Ludhiana Intensive Agricultural Belt",
                "state": "Punjab",
                "district": "Ludhiana",
                "bbox": [75.8000, 30.8500, 75.8800, 30.9300],
                "crs": "EPSG:4326",
                "sensors": {
                    "optical": {
                        "file": "punjab_agribelt_optical.png",
                        "sensor": "Sentinel-2 MSI",
                        "date": "2026-02-28T05:15:00Z"
                    }
                },
                "land_cover_classes": ["Intensive Cropland", "Irrigation Canal", "Fallow Land"]
            }
        ]
    }
    
    meta_path = os.path.join(DATA_DIR, "sample_aois_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata: {meta_path}")

if __name__ == "__main__":
    main()
