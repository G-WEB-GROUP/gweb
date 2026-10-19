#!/usr/bin/env bash
# One-time setup of the staging site on a SHARED server (the one hosting horpyna.g-web.group).
# Run as root (the "Setup staging server" GitHub workflow uploads and runs it with sudo).
#
#   sudo DEPLOY_USER=<ssh user> bash setup-staging.sh
#
# What it does (and only this — other sites on the server are not touched):
#   - folders /var/www/bakedinweston, /opt/bakedinweston-contact, /etc/bakedinweston (owned by DEPLOY_USER)
#   - nginx: snippets/bakedinweston-*.inc + one vhost for bakedinweston.g-web.group
#   - HTTPS certificate for bakedinweston.g-web.group (certbot, webroot)
#   - contact form service (systemd, port 8787) — only if Node 20+ is available
# Every nginx change is checked with "nginx -t"; if the check fails, our files are removed again.
# Safe to run more than once.
set -euo pipefail

DOMAIN="${DOMAIN:-bakedinweston.g-web.group}"
DEPLOY_USER="${DEPLOY_USER:?Set DEPLOY_USER (the SSH user that will deploy)}"
SRC="$(cd "$(dirname "$0")" && pwd)"          # uploaded bundle: deploy/, server/
TEST_MODE="${BIW_TEST:-}"                      # local testing: skip certbot/systemd
SITE=/var/www/bakedinweston
APP=/opt/bakedinweston-contact
CONF_NAME=bakedinweston-staging.conf

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33mWARNING: %s\033[0m\n' "$*"; }
die()  { printf '\033[31mERROR: %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "run as root (sudo)"
id "$DEPLOY_USER" >/dev/null 2>&1 || die "user $DEPLOY_USER does not exist"

say "Checks"
if ! command -v nginx >/dev/null; then
  echo "Web servers on this machine (who listens on ports 80/443):"
  ss -ltnpH '( sport = :80 or sport = :443 )' 2>/dev/null || true
  for b in apache2 httpd caddy traefik docker lsws litespeed; do command -v "$b" >/dev/null && echo "found: $b"; done
  command -v docker >/dev/null && docker ps --format '{{.Names}}  {{.Image}}  {{.Ports}}' 2>/dev/null | head -20 || true
  die "nginx is not installed on this server. This setup expects nginx (no changes made)."
fi
nginx -t >/dev/null 2>&1 || die "nginx config is already broken before our changes (nginx -t fails). No changes made."
if [ -d /etc/nginx/sites-enabled ]; then
  AVAIL=/etc/nginx/sites-available; ENABLED=/etc/nginx/sites-enabled; LINK=1
else
  AVAIL=/etc/nginx/conf.d; ENABLED=/etc/nginx/conf.d; LINK=
fi
mkdir -p /etc/nginx/snippets "$AVAIL"
# Names we use must not exist in other configs
if grep -rqsE 'zone=biw_contact|\$biw_robots' /etc/nginx --exclude='bakedinweston*'; then
  die "another nginx config already uses biw_contact / biw_robots. No changes made."
fi
if grep -rqs "server_name[^;]*\b${DOMAIN//./\\.}\b" /etc/nginx --exclude='bakedinweston*'; then
  die "another nginx config already serves $DOMAIN. No changes made."
fi
SERVER_IPS="$(hostname -I 2>/dev/null || true)"
DNS_IP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)"
if [ -z "$DNS_IP" ]; then
  warn "$DOMAIN does not resolve yet (DNS). The certificate step will fail until it does."
elif ! grep -qw "$DNS_IP" <<<"$SERVER_IPS"; then
  warn "$DOMAIN points to $DNS_IP, this server has: $SERVER_IPS (fine if behind NAT; otherwise fix the A record)"
else
  echo "DNS ok: $DOMAIN -> $DNS_IP"
fi

say "Packages (only if missing): rsync, certbot"
if command -v apt-get >/dev/null; then
  NEED=()
  command -v rsync   >/dev/null || NEED+=(rsync)
  command -v certbot >/dev/null || NEED+=(certbot)
  if [ ${#NEED[@]} -gt 0 ]; then
    DEBIAN_FRONTEND=noninteractive apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${NEED[@]}"
  fi
else
  command -v rsync >/dev/null && command -v certbot >/dev/null || die "install rsync and certbot first (no apt-get here)"
fi

say "Folders"
mkdir -p "$SITE/releases" /var/www/letsencrypt "$APP" /etc/bakedinweston
chown -R "$DEPLOY_USER": "$SITE" "$APP"
if [ ! -e "$SITE/current" ]; then
  mkdir -p "$SITE/releases/00000000-000000"
  cat > "$SITE/releases/00000000-000000/index.html" <<'HTML'
<!doctype html><meta charset="utf-8"><title>Baked in Weston</title><p style="font:20px system-ui;margin:3em">Baked in Weston preview — the first deploy is on its way.</p>
HTML
  ln -sfn "$SITE/releases/00000000-000000" "$SITE/current"
  chown -R "$DEPLOY_USER": "$SITE"
fi

say "nginx"
for f in "$SRC"/deploy/nginx/bakedinweston-*.inc; do install -m 644 "$f" /etc/nginx/snippets/; done
FULL_CONF="$SRC/deploy/nginx/$CONF_NAME"
TARGET="$AVAIL/$CONF_NAME"

enable_conf() {   # $1 = file content source
  install -m 644 "$1" "$TARGET"
  if [ -n "$LINK" ]; then ln -sfn "$TARGET" "$ENABLED/$CONF_NAME"; fi
  if ! nginx -t; then
    warn "nginx -t failed — removing our site config again"
    rm -f "$ENABLED/$CONF_NAME" "$TARGET"
    nginx -t && reload_nginx
    die "nginx check failed, nothing changed for other sites"
  fi
  reload_nginx
}
reload_nginx() {
  if [ -n "$TEST_MODE" ]; then nginx -s reload; else systemctl reload nginx; fi
}

CERT=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
if [ ! -f "$CERT" ]; then
  # Step 1: HTTP only (first server block), so certbot can answer the challenge
  awk 'BEGIN{n=0} /^server \{/{n++} n<2{print}' "$FULL_CONF" \
    | sed 's#^    location / { return 301 https://$host$request_uri; }#    include snippets/bakedinweston-site.inc;#' > /tmp/biw-http-only.conf
  grep -q 'include snippets/bakedinweston-site.inc' /tmp/biw-http-only.conf || die "could not build the HTTP-only config"
  enable_conf /tmp/biw-http-only.conf
  if [ -n "$TEST_MODE" ]; then
    warn "test mode: skipping certbot"
  else
    say "HTTPS certificate"
    certbot certonly --webroot -w /var/www/letsencrypt -d "$DOMAIN" \
      --non-interactive --agree-tos --register-unsafely-without-email \
      --deploy-hook "systemctl reload nginx" \
      || die "certbot failed. Check that $DOMAIN points to this server, then run the setup again. The site works over http://$DOMAIN meanwhile."
  fi
fi
[ -f "$CERT" ] && enable_conf "$FULL_CONF"

say "Contact form service"
NODE_OK=
if command -v node >/dev/null; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  [ "$NODE_MAJOR" -ge 20 ] && NODE_OK=1 || warn "Node $(node -v) is older than 20 — not touching it; contact form service skipped"
elif command -v apt-get >/dev/null; then
  echo "Installing Node.js 22 (none present)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
  NODE_OK=1
fi
PORT_BUSY="$(ss -ltnpH 'sport = :8787' 2>/dev/null | grep -v bakedinweston || true)"
if [ -n "$PORT_BUSY" ] && ! systemctl is-active --quiet bakedinweston-contact 2>/dev/null; then
  warn "port 8787 is used by another program — contact form service skipped: $PORT_BUSY"
  NODE_OK=
fi
if [ -n "$NODE_OK" ]; then
  rsync -a --delete --exclude node_modules --exclude test.mjs "$SRC/server/" "$APP/"
  (cd "$APP" && npm ci --omit=dev --no-audit --no-fund --silent)
  chown -R "$DEPLOY_USER": "$APP"
  if [ ! -f /etc/bakedinweston/contact.env ]; then
    # No SMTP yet: messages are only written to the service log (journalctl -u bakedinweston-contact)
    sed -e 's/^SMTP_HOST=.*/SMTP_HOST=/' -e 's/^SMTP_PASS=.*/SMTP_PASS=/' "$SRC/deploy/contact.env.example" > /etc/bakedinweston/contact.env
    chmod 600 /etc/bakedinweston/contact.env
  fi
  sed "s#/usr/bin/node#$(command -v node)#" "$SRC/deploy/bakedinweston-contact.service" > /etc/systemd/system/bakedinweston-contact.service
  if [ -z "$TEST_MODE" ]; then
    systemctl daemon-reload
    systemctl enable --now bakedinweston-contact >/dev/null
    systemctl restart bakedinweston-contact
    sleep 1
    systemctl is-active --quiet bakedinweston-contact && echo "contact service running" || warn "contact service did not start: journalctl -u bakedinweston-contact"
  fi
fi

say "Deploy permissions"
if [ "$DEPLOY_USER" != root ]; then
  echo "$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart bakedinweston-contact, /bin/systemctl restart bakedinweston-contact" > /tmp/biw-sudoers
  visudo -cf /tmp/biw-sudoers >/dev/null && install -m 440 /tmp/biw-sudoers /etc/sudoers.d/bakedinweston-deploy
fi

say "Done"
if [ -f "$CERT" ]; then echo "Preview: https://$DOMAIN"; else echo "Preview: http://$DOMAIN (HTTPS after the certificate step succeeds)"; fi
