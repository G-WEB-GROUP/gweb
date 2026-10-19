#!/usr/bin/env bash
# Build the site and upload it to the server.
#
#   DEPLOY_HOST=203.0.113.10 DEPLOY_USER=deploy ./scripts/deploy.sh          # site + contact service
#   DEPLOY_HOST=203.0.113.10 DEPLOY_USER=deploy ./scripts/deploy.sh --site   # site only
#
# Each deploy goes to /var/www/bakedinweston/releases/<time>/ and the "current" symlink is switched
# at the end, so visitors never see a half-uploaded site. The last 5 releases are kept.
# Roll back:  ./scripts/deploy.sh --rollback   (points "current" to the previous release)
set -euo pipefail

: "${DEPLOY_HOST:?Set DEPLOY_HOST (server IP or name)}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
SITE_DIR="${SITE_DIR:-/var/www/bakedinweston}"
APP_DIR="${APP_DIR:-/opt/bakedinweston-contact}"
# Password login (CI): set SSHPASS and SSH_WRAP="sshpass -e". Key login: leave both empty.
SSH_BASE="${SSH_WRAP:-} ssh -o StrictHostKeyChecking=accept-new"
SSH="$SSH_BASE ${DEPLOY_USER}@${DEPLOY_HOST}"
SUDO=$([ "$DEPLOY_USER" = root ] && echo "" || echo "sudo")
cd "$(dirname "$0")/.."

if [[ "${1:-}" == "--rollback" ]]; then
  $SSH "set -e; cd $SITE_DIR/releases; cur=\$(basename \$(readlink -f $SITE_DIR/current)); \
        prev=\$(ls -1 | sort | grep -B1 -x \"\$cur\" | head -n 1); \
        [ \"\$prev\" != \"\$cur\" ] || { echo 'no older release'; exit 1; }; \
        ln -sfn $SITE_DIR/releases/\$prev $SITE_DIR/current.tmp && mv -Tf $SITE_DIR/current.tmp $SITE_DIR/current; \
        echo now serving \$prev"
  exit 0
fi

echo "==> Build"
npm ci
npm run build

REL=$(date -u +%Y%m%d-%H%M%S)
echo "==> Upload release $REL"
$SSH "mkdir -p $SITE_DIR/releases/$REL"
LAST=$($SSH "readlink -f $SITE_DIR/current || true")
# Reuse unchanged files from the current release to make uploads fast
rsync -az --delete -e "$SSH_BASE" ${LAST:+--link-dest="$LAST"} dist/ "${DEPLOY_USER}@${DEPLOY_HOST}:$SITE_DIR/releases/$REL/"

echo "==> Switch"
$SSH "ln -sfn $SITE_DIR/releases/$REL $SITE_DIR/current.tmp && mv -Tf $SITE_DIR/current.tmp $SITE_DIR/current && \
      cd $SITE_DIR/releases && ls -1 | sort | head -n -5 | xargs -r rm -rf"

if [[ "${1:-}" != "--site" ]]; then
  echo "==> Contact service"
  # Dependencies are installed here (pure JS) and uploaded, so the server needs no npm
  (cd server && npm ci --omit=dev --no-audit --no-fund --silent)
  rsync -az --delete -e "$SSH_BASE" --exclude test.mjs server/ "${DEPLOY_USER}@${DEPLOY_HOST}:$APP_DIR/"
  # Restarts the service (systemd or the biw-contact container)
  $SSH "$SUDO /usr/local/bin/biw-restart-contact"
fi

echo "==> Done: release $REL is live on $DEPLOY_HOST"
