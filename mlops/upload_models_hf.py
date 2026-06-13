"""
Upload YOLO model weights to the Hugging Face Hub — free, no credit card,
preserves the ai_assets/ folder layout so model_fetch.py can pull them via
  R2_MODELS_BASE_URL=https://huggingface.co/<user>/<repo>/resolve/main

Setup (one-time):
  1. Create a free account at https://huggingface.co
  2. Create a model repo (e.g. <user>/smart-farm-models)
  3. Get a write token: https://huggingface.co/settings/tokens
  4. pip install huggingface_hub
  5. python mlops/upload_models_hf.py --repo <user>/smart-farm-models --token hf_xxx

Then set in backend/.env:
  R2_MODELS_BASE_URL=https://huggingface.co/<user>/smart-farm-models/resolve/main
"""
import argparse
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "ai_assets"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True, help="<user>/<repo> on Hugging Face")
    ap.add_argument("--token", default=os.getenv("HF_TOKEN", ""))
    args = ap.parse_args()
    if not args.token:
        raise SystemExit("Provide --token or set HF_TOKEN")

    from huggingface_hub import HfApi, create_repo

    api = HfApi(token=args.token)
    create_repo(args.repo, repo_type="model", exist_ok=True, token=args.token)

    weights = [p for p in ASSETS.rglob("*")
               if p.suffix in (".pt", ".onnx") and p.name in ("best.pt", "best.onnx")]
    print(f"Uploading {len(weights)} model files to {args.repo} ...")
    for w in weights:
        rel = w.relative_to(ASSETS).as_posix()   # mirrors ai_assets layout
        print(f"  → {rel}")
        api.upload_file(
            path_or_fileobj=str(w),
            path_in_repo=rel,
            repo_id=args.repo,
            repo_type="model",
        )
    print("\nDone. Set in backend/.env:")
    print(f"  R2_MODELS_BASE_URL=https://huggingface.co/{args.repo}/resolve/main")


if __name__ == "__main__":
    main()
