"""
fix_kaggle_zip.py — streaming rename, no disk extraction needed.
Usage:
    python fix_kaggle_zip.py --input "D:/cv data/PlantDocyolov11.zip" --output "D:/cv data/PlantDoc_fixed.zip"
"""
import zipfile, argparse
from pathlib import Path

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def short_name(arcname: str, counters: dict) -> str:
    parts = arcname.replace("\\", "/").split("/")
    *folders, filename = parts
    ext = Path(filename).suffix
    key = "/".join(folders)
    counters.setdefault(key, 0)
    counters[key] += 1
    return "/".join(folders + [f"img_{counters[key]:06d}{ext}"])


def fix_zip(input_zip: str, output_zip: str):
    in_path  = Path(input_zip)
    out_path = Path(output_zip)
    counters = {}
    rename_map = {}

    # Pass 1 — build rename map (stream, no extraction)
    print(f"Scanning {in_path.name} ...")
    with zipfile.ZipFile(in_path, "r") as zf:
        all_names = zf.namelist()

    long_entries = [n for n in all_names if len(n.encode("utf-8")) > 248]
    print(f"  Total entries : {len(all_names)}")
    print(f"  Too long (>248 bytes) : {len(long_entries)}")

    for arcname in all_names:
        if len(arcname.encode("utf-8")) > 248:
            ext = Path(arcname).suffix.lower()
            if ext in IMAGE_EXT or ext == ".txt":
                rename_map[arcname] = short_name(arcname, counters)

    # Also remap labels that pair with renamed images
    label_remap = {}
    for old, new in list(rename_map.items()):
        if Path(old).suffix.lower() in IMAGE_EXT:
            old_lbl = old.replace("/images/", "/labels/").rsplit(".", 1)[0] + ".txt"
            new_lbl = new.replace("/images/", "/labels/").rsplit(".", 1)[0] + ".txt"
            if old_lbl not in rename_map:
                label_remap[old_lbl] = new_lbl
    rename_map.update(label_remap)

    # Pass 2 — stream copy with rename (never touches disk for images)
    print(f"Writing {out_path.name} ...")
    written = renamed = 0

    with zipfile.ZipFile(in_path, "r") as zf_in, \
         zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED, allowZip64=True) as zf_out:

        for info in zf_in.infolist():
            data = zf_in.read(info.filename)
            arc  = rename_map.get(info.filename, info.filename)
            if arc != info.filename:
                renamed += 1
            zf_out.writestr(arc, data)
            written += 1
            if written % 200 == 0:
                print(f"  {written}/{len(all_names)} ...", end="\r")

    size_mb = out_path.stat().st_size / 1024 ** 2
    print(f"\n  {written} entries, {renamed} renamed — {size_mb:.1f} MB")

    # Verify
    with zipfile.ZipFile(out_path, "r") as zf:
        still_long = [n for n in zf.namelist() if len(n.encode("utf-8")) > 248]

    if still_long:
        print(f"  WARNING: {len(still_long)} entries still > 248 bytes")
        for n in still_long[:3]:
            print(f"    {n}")
    else:
        print(f"  All entries <= 248 bytes — ready for Kaggle!")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--input",  required=True)
    p.add_argument("--output", required=True)
    a = p.parse_args()
    fix_zip(a.input, a.output)
