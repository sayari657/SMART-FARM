#!/usr/bin/env bash
# ============================================================
#  FARM AI — Oracle Cloud Free Tier Setup Script
#  Tested on Ubuntu 22.04 LTS (aarch64 / ARM Ampere)
#
#  Run as root or with sudo:
#    chmod +x setup_oracle.sh && sudo ./setup_oracle.sh
# ============================================================
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; NC='\033[0m'; BOLD='\033[1m'

step()  { echo -e "\n${BLUE}${BOLD}▶ $*${NC}"; }
ok()    { echo -e "${GREEN}  ✓ $*${NC}"; }
warn()  { echo -e "${YELLOW}  ⚠ $*${NC}"; }
error() { echo -e "${RED}  ✗ $*${NC}"; exit 1; }

echo ""
echo -e "${BLUE}${BOLD}╔══════════════════════════════════════════════════════════╗"
echo -e "║       FARM AI — Oracle Cloud Deployment Setup            ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Must run as root ─────────────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    error "Please run as root: sudo ./setup_oracle.sh"
fi

# ── Detect public IP ─────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me || curl -s --max-time 5 icanhazip.com || echo "UNKNOWN")
echo -e "  Public IP detected: ${BOLD}${PUBLIC_IP}${NC}"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1 — System update
# ═══════════════════════════════════════════════════════════════════════════════
step "Step 1/7 — Updating system packages"
apt-get update -qq
apt-get upgrade -y -qq
ok "System updated"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Install Docker + Docker Compose plugin + tools
# ═══════════════════════════════════════════════════════════════════════════════
step "Step 2/7 — Installing Docker and dependencies"

apt-get install -y -qq \
    ca-certificates curl gnupg lsb-release \
    git nano ufw iptables-persistent netfilter-persistent

# Docker official repo
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
    ok "Docker installed"
else
    ok "Docker already installed ($(docker --version))"
fi

# Allow ubuntu (non-root) user to run docker
if id ubuntu &>/dev/null; then
    usermod -aG docker ubuntu
    ok "Added ubuntu user to docker group"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Firewall: UFW + Oracle's iptables REJECT rules
# ═══════════════════════════════════════════════════════════════════════════════
step "Step 3/7 — Configuring firewall"

# UFW rules
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh          # port 22
ufw allow 80/tcp       # HTTP
ufw allow 443/tcp      # HTTPS
ufw --force enable
ok "UFW configured (22, 80, 443 open)"

# Oracle Cloud injects iptables REJECT rules for ports 80 and 443 by default.
# We must explicitly INSERT ACCEPT rules BEFORE those REJECT rules.
# The chain is INPUT; rules are processed top-to-bottom.

# Remove any existing Oracle REJECT rules for 80/443 (idempotent)
iptables -D INPUT -p tcp --dport 80  -j REJECT 2>/dev/null || true
iptables -D INPUT -p tcp --dport 443 -j REJECT 2>/dev/null || true

# Accept 80 and 443
iptables -I INPUT 1 -p tcp --dport 80  -j ACCEPT
iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
iptables -I INPUT 1 -p tcp --dport 22  -j ACCEPT

ok "iptables ACCEPT rules inserted for ports 22, 80, 443"

# Persist iptables rules across reboots
netfilter-persistent save
ok "iptables rules saved (persistent)"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Clone / update the FARM AI repository
# ═══════════════════════════════════════════════════════════════════════════════
step "Step 4/7 — Getting the FARM AI code"

APP_DIR="/opt/farm-ai"

if [[ -d "$APP_DIR/.git" ]]; then
    echo "  Repository already exists — pulling latest changes..."
    git -C "$APP_DIR" pull
    ok "Repository updated"
else
    echo ""
    echo "  Enter your GitHub repository URL."
    echo "  Example: https://github.com/yourname/farm-ai"
    echo ""
    read -rp "  GitHub repo URL: " REPO_URL
    REPO_URL="${REPO_URL// /}"  # strip spaces

    if [[ -z "$REPO_URL" ]]; then
        error "No repository URL provided."
    fi

    git clone "$REPO_URL" "$APP_DIR"
    ok "Repository cloned to $APP_DIR"
fi

cd "$APP_DIR"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5 — .env.production
# ═══════════════════════════════════════════════════════════════════════════════
step "Step 5/7 — Environment configuration"

ENV_FILE="$APP_DIR/.env.production"

if [[ -f "$ENV_FILE" ]]; then
    warn ".env.production already exists — skipping creation"
    warn "Edit manually if needed: nano $ENV_FILE"
else
    echo ""
    echo "  We'll configure your environment variables now."
    echo "  Press Enter to accept the default shown in [brackets]."
    echo ""

    # SECRET_KEY — auto-generate
    DEFAULT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || \
                     openssl rand -hex 32)

    read -rp "  SECRET_KEY          [auto-generated]: " SECRET_KEY
    SECRET_KEY="${SECRET_KEY:-$DEFAULT_SECRET}"

    read -rp "  CORS_ORIGINS        [http://${PUBLIC_IP}]: " CORS_ORIGINS
    CORS_ORIGINS="${CORS_ORIGINS:-http://${PUBLIC_IP}}"

    read -rp "  SMTP_HOST           [smtp.gmail.com]: " SMTP_HOST
    SMTP_HOST="${SMTP_HOST:-smtp.gmail.com}"

    read -rp "  SMTP_PORT           [465]: " SMTP_PORT
    SMTP_PORT="${SMTP_PORT:-465}"

    read -rp "  SMTP_EMAIL          (Gmail address): " SMTP_EMAIL
    read -rp "  SMTP_PASSWORD       (Gmail app password): " SMTP_PASSWORD

    read -rp "  WHATSAPP_TOKEN      []: " WHATSAPP_TOKEN
    read -rp "  WHATSAPP_PHONE_ID   []: " WHATSAPP_PHONE_ID

    read -rp "  GROQ_API_KEY        []: " GROQ_API_KEY

    cat > "$ENV_FILE" <<EOF
# FARM AI — Production environment
# Generated by setup_oracle.sh on $(date -u +"%Y-%m-%d %T UTC")

SECRET_KEY=${SECRET_KEY}
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# SQLite (Oracle Free Tier — no PostgreSQL needed)
DATABASE_URL=sqlite:////data/smart_farm.db

# CORS — allow your public IP (add domain later if needed)
CORS_ORIGINS=${CORS_ORIGINS}

# SMTP (email alerts — Gmail App Password)
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_EMAIL=${SMTP_EMAIL}
SMTP_PASSWORD=${SMTP_PASSWORD}

# WhatsApp OTP
WHATSAPP_TOKEN=${WHATSAPP_TOKEN}
WHATSAPP_PHONE_ID=${WHATSAPP_PHONE_ID}

# Groq AI (reports)
GROQ_API_KEY=${GROQ_API_KEY}

# Lite mode — disables YOLO / Ollama (no GPU on Oracle ARM)
LITE_MODE=true

# MQTT (public broker — no local broker needed)
MQTT_BROKER=broker.hivemq.com
MQTT_PORT=1883
EOF

    chmod 600 "$ENV_FILE"
    ok ".env.production created (permissions: 600)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Create IoT directory (needed for volume mount)
# ═══════════════════════════════════════════════════════════════════════════════
step "Step 6/7 — Preparing data directories"

mkdir -p "$APP_DIR/iot"
# Create empty CSV with header if it doesn't exist
IOT_CSV="$APP_DIR/iot/iot_telemetry.csv"
if [[ ! -f "$IOT_CSV" ]]; then
    echo "ts,device,co,humidity,lpg,motion,smoke,temp,light" > "$IOT_CSV"
    ok "Created empty $IOT_CSV"
else
    ok "IoT CSV already exists"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7 — Build and start containers
# ═══════════════════════════════════════════════════════════════════════════════
step "Step 7/7 — Building and starting FARM AI containers"
echo ""
echo "  This may take 5-10 minutes on first run (downloading base images)..."
echo ""

cd "$APP_DIR"
docker compose -f docker-compose.oracle.yml down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.oracle.yml up -d --build

# Wait for backend health
echo ""
echo "  Waiting for backend to become healthy..."
RETRIES=0
MAX_RETRIES=20
until docker inspect --format='{{.State.Health.Status}}' farmai-backend 2>/dev/null | grep -q "healthy"; do
    RETRIES=$((RETRIES + 1))
    if [[ $RETRIES -ge $MAX_RETRIES ]]; then
        warn "Backend health check timed out — check logs: docker logs farmai-backend"
        break
    fi
    echo -n "."
    sleep 10
done
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# DONE
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════╗"
echo -e "║            FARM AI is running!                           ║"
echo -e "╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}App URL:${NC}      http://${PUBLIC_IP}"
echo -e "  ${BOLD}API docs:${NC}     http://${PUBLIC_IP}/api/docs"
echo -e "  ${BOLD}App dir:${NC}      $APP_DIR"
echo -e "  ${BOLD}Logs:${NC}         docker compose -f $APP_DIR/docker-compose.oracle.yml logs -f"
echo -e "  ${BOLD}Restart:${NC}      docker compose -f $APP_DIR/docker-compose.oracle.yml restart"
echo ""
echo -e "  ${YELLOW}${BOLD}IMPORTANT — Oracle Cloud Security List:${NC}"
echo -e "  ${YELLOW}If http://${PUBLIC_IP} is unreachable, also open ports in the${NC}"
echo -e "  ${YELLOW}Oracle Console → Networking → VCN → Security Lists → Add Ingress:${NC}"
echo -e "  ${YELLOW}  Source: 0.0.0.0/0  Protocol: TCP  Port: 80${NC}"
echo -e "  ${YELLOW}  Source: 0.0.0.0/0  Protocol: TCP  Port: 443${NC}"
echo ""
echo -e "  ${BLUE}To add HTTPS later (when you have a domain):${NC}"
echo -e "  ${BLUE}  1. Edit .env.production → set DOMAIN=yourdomain.com${NC}"
echo -e "  ${BLUE}  2. Edit Caddyfile → switch to MODE B (domain block)${NC}"
echo -e "  ${BLUE}  3. Uncomment caddy in docker-compose.oracle.yml${NC}"
echo -e "  ${BLUE}  4. docker compose -f docker-compose.oracle.yml up -d --build${NC}"
echo ""
echo -e "  ${BLUE}To update the app after a git push:${NC}"
echo -e "  ${BLUE}  cd $APP_DIR && git pull && docker compose -f docker-compose.oracle.yml up -d --build${NC}"
echo ""
