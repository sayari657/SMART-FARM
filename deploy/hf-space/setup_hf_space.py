"""Create + configure the Smart Farm AI backend Hugging Face Space (Docker).

Usage (PowerShell):
    $env:HF_TOKEN = "hf_xxx_your_write_token"
    .\.venv\Scripts\python.exe deploy\hf-space\setup_hf_space.py

What it does:
  1. Creates the Docker Space  <user>/smartfarm-backend  (idempotent).
  2. Uploads Dockerfile + README.md from this folder.
  3. Sets the Space secrets/variables (SECRET_KEY auto-generated, CORS for the
     Pages frontend) and copies optional keys from backend/.env if present.
  4. Prints the public backend URL to bake into the frontend.
"""
import os
import pathlib
import secrets
import sys

try:
    from huggingface_hub import HfApi
except ImportError:
    sys.exit("pip install huggingface_hub  (run inside the project .venv)")

token = os.environ.get("HF_TOKEN", "").strip()
if not token:
    sys.exit("Set HF_TOKEN env var with a *write* token (huggingface.co/settings/tokens).")

space_name = os.environ.get("SPACE_NAME", "smartfarm-backend")
here = pathlib.Path(__file__).resolve().parent
backend_env = here.parents[1] / "backend" / ".env"

api = HfApi(token=token)
user = api.whoami()["name"]
repo_id = f"{user}/{space_name}"

print(f"[1/4] Creating Docker Space  {repo_id} ...")
api.create_repo(repo_id=repo_id, repo_type="space", space_sdk="docker", exist_ok=True)

print("[2/4] Uploading Dockerfile + README ...")
for fname in ("Dockerfile", "README.md"):
    api.upload_file(path_or_fileobj=str(here / fname), path_in_repo=fname,
                    repo_id=repo_id, repo_type="space")

print("[3/4] Setting secrets / variables ...")
api.add_space_secret(repo_id, "SECRET_KEY", os.environ.get("SECRET_KEY") or secrets.token_hex(32))
api.add_space_variable(repo_id, "CORS_ORIGINS",
                       "https://farmai-7ye.pages.dev,http://localhost:5173,http://127.0.0.1:5173")
api.add_space_variable(repo_id, "USE_SQLITE", "true")
api.add_space_variable(repo_id, "LITE_MODE", "false")

# Copy optional feature keys from backend/.env so email/Groq/WhatsApp work too.
wanted = ["GROQ_API_KEY", "SMTP_EMAIL", "SMTP_PASSWORD", "WHATSAPP_TOKEN",
          "WHATSAPP_PHONE_ID", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY",
          "STRIPE_SECRET_KEY", "DATABASE_URL"]
copied = []
if backend_env.exists():
    env = {}
    for line in backend_env.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    for k in wanted:
        if env.get(k):
            api.add_space_secret(repo_id, k, env[k])
            copied.append(k)
print(f"      Optional secrets copied from backend/.env: {copied or 'none'}")

backend_url = f"https://{user.lower()}-{space_name}.hf.space"
print("[4/4] Done.")
print("  Space page :", f"https://huggingface.co/spaces/{repo_id}")
print("  Backend URL:", backend_url)
print("  (Build takes ~5-10 min. Then bake this URL into the frontend:")
print(f"     VITE_API_URL={backend_url}/api/v1")
print(f"     VITE_WS_URL={backend_url.replace('https','wss')} )")
