#!/usr/bin/env bash
set -euo pipefail

SERVER_USER="root"
SERVER_HOST="206.81.12.55"
REMOTE_DIR="/var/www/marketing"
SSH_KEY="${HOME}/.ssh/pine"  # Path to your private key

# SSH options with your key
SSH_OPTS=(-i "${SSH_KEY}" -o StrictHostKeyChecking=no)

HERE="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Ensuring remote dir exists"
ssh "${SSH_OPTS[@]}" "${SERVER_USER}@${SERVER_HOST}" "mkdir -p '${REMOTE_DIR}'"

echo "==> Syncing files to ${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}"
rsync -avz --delete -e "ssh ${SSH_OPTS[*]}" \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'data' \
  --exclude '.env' \
  "${HERE}/" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/"

# Copy .env on the FIRST push only
if ssh "${SSH_OPTS[@]}" "${SERVER_USER}@${SERVER_HOST}" "test -f '${REMOTE_DIR}/.env'"; then
  echo "==> Remote .env already exists - leaving it untouched."
else
  echo "==> No remote .env found - copying your local .env (first-time setup)."
  scp "${SSH_OPTS[@]}" "${HERE}/.env" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}/.env"
fi

echo "==> Installing deps and restarting service"
ssh "${SSH_OPTS[@]}" "${SERVER_USER}@${SERVER_HOST}" bash -s <<'EOF'
  set -e

  export NVM_DIR="$HOME/.nvm"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
  fi

  export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin:$PATH"
  export PATH="$HOME/.local/bin:$PATH"

  cd /var/www/marketing

  NPM_CMD=""
  if command -v npm >/dev/null 2>&1; then
    NPM_CMD="npm"
  elif [ -f /usr/bin/npm ]; then
    NPM_CMD="/usr/bin/npm"
  elif [ -f /usr/local/bin/npm ]; then
    NPM_CMD="/usr/local/bin/npm"
  elif ls ~/.nvm/versions/node/*/bin/npm >/dev/null 2>&1; then
    NPM_CMD=$(ls ~/.nvm/versions/node/*/bin/npm | head -1)
  fi

  if [ -z "$NPM_CMD" ]; then
    echo "ERROR: npm not found. Node.js may not be installed."
    exit 1
  fi

  echo "Using npm: $NPM_CMD"
  $NPM_CMD ci --omit=dev 2>/dev/null || $NPM_CMD install --omit=dev

  chown -R www-data:www-data /var/www/marketing
  find /var/www/marketing -type d -exec chmod 755 {} \;
  find /var/www/marketing -type f -exec chmod 644 {} \;
  chmod 600 /var/www/marketing/.env 2>/dev/null || true
  chmod 755 /var/www/marketing/server.js

  systemctl restart marketing || echo "(service not set up yet)"
  echo "Deploy complete."
EOF

echo "==> Done."