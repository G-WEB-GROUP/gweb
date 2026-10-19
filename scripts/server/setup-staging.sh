#!/usr/bin/env bash
# One-time setup of the staging site on a SHARED server (the one hosting horpyna.g-web.group).
# Run as root (the "Setup staging server" GitHub workflow uploads and runs it with sudo).
#
#   sudo DEPLOY_USER=<ssh user> bash setup-staging.sh
#
# Two layouts are supported; the script detects which one the server has:
#   host   — nginx installed on the server: adds one vhost + snippets, certbot on the host,
#            contact form as a systemd service.
#   docker — nginx runs in a Docker container that holds ports 80/443 (e.g. scb-proxy-nginx-1):
#            adds one file to that proxy's conf.d, runs our own containers "biw-web" (static site)
#            and "biw-contact" (form) on the proxy's network, certificate via the certbot image.
# Other sites are not touched. Every nginx change is checked with "nginx -t"; if the check fails,
# our file is removed again and nothing is reloaded. Safe to run more than once.
set -euo pipefail

DOMAIN="${DOMAIN:-bakedinweston.g-web.group}"
DEPLOY_USER="${DEPLOY_USER:?Set DEPLOY_USER (the SSH user that will deploy)}"
SRC="$(cd "$(dirname "$0")" && pwd)"          # uploaded bundle: deploy/, server/, scripts
TEST_MODE="${BIW_TEST:-}"                      # local testing: no real certificate / systemd
SITE=/var/www/bakedinweston
APP=/opt/bakedinweston-contact
CONF_NAME=bakedinweston-staging.conf

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[33mWARNING: %s\033[0m\n' "$*"; }
die()  { printf '\033[31mERROR: %s\033[0m\n' "$*"; exit 1; }

[ "$(id -u)" = 0 ] || die "run as root (sudo)"
id "$DEPLOY_USER" >/dev/null 2>&1 || die "user $DEPLOY_USER does not exist"

# ---------------------------------------------------------------------------
say "Checks"
MODE=
PROXY="${PROXY:-}"
if command -v nginx >/dev/null; then
  MODE=host
elif command -v docker >/dev/null; then
  if [ -z "$PROXY" ]; then
    # The container that publishes port 80 and runs an nginx image
    PROXY="$(docker ps --format '{{.Names}}|{{.Image}}|{{.Ports}}' \
      | awk -F'|' '$3 ~ /:80->80\/tcp/ && $2 ~ /nginx/ {print $1; exit}')"
  fi
  [ -n "$PROXY" ] && MODE=docker
fi
if [ -z "$MODE" ]; then
  echo "Web servers on this machine (who listens on ports 80/443):"
  ss -ltnpH '( sport = :80 or sport = :443 )' 2>/dev/null || true
  command -v docker >/dev/null && docker ps --format '{{.Names}}  {{.Image}}  {{.Ports}}' 2>/dev/null | head -20 || true
  die "no nginx found (neither installed nor in a Docker container on port 80). No changes made."
fi
echo "Layout: $MODE${PROXY:+ (proxy container: $PROXY)}"

SERVER_IPS="$(hostname -I 2>/dev/null || true)"
DNS_IP="$(getent ahostsv4 "$DOMAIN" | awk 'NR==1{print $1}' || true)"
if [ -z "$DNS_IP" ]; then
  warn "$DOMAIN does not resolve yet (DNS). The certificate step will fail until it does."
elif ! grep -qw "$DNS_IP" <<<"$SERVER_IPS"; then
  warn "$DOMAIN points to $DNS_IP, this server has: $SERVER_IPS (fine if behind NAT; otherwise fix the A record)"
else
  echo "DNS ok: $DOMAIN -> $DNS_IP"
fi

apt_need() {   # install missing commands with apt-get
  local need=()
  for c in "$@"; do command -v "$c" >/dev/null || need+=("$c"); done
  [ ${#need[@]} -eq 0 ] && return 0
  command -v apt-get >/dev/null || die "please install: ${need[*]}"
  DEBIAN_FRONTEND=noninteractive apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "${need[@]}"
}

# ---------------------------------------------------------------------------
say "Folders"
apt_need rsync
mkdir -p "$SITE/releases" "$APP" /etc/bakedinweston
chown -R "$DEPLOY_USER": "$SITE" "$APP"
if [ ! -e "$SITE/current" ]; then
  mkdir -p "$SITE/releases/00000000-000000"
  cat > "$SITE/releases/00000000-000000/index.html" <<'HTML'
<!doctype html><meta charset="utf-8"><title>Baked in Weston</title><p style="font:20px system-ui;margin:3em">Baked in Weston preview — the first deploy is on its way.</p>
HTML
  ln -sfn "$SITE/releases/00000000-000000" "$SITE/current"
  chown -R "$DEPLOY_USER": "$SITE"
fi
if [ ! -f /etc/bakedinweston/contact.env ]; then
  # No SMTP yet: form messages are only written to the service log
  sed -e 's/^SMTP_HOST=.*/SMTP_HOST=/' -e 's/^SMTP_PASS=.*/SMTP_PASS=/' "$SRC/deploy/contact.env.example" > /etc/bakedinweston/contact.env
  chmod 600 /etc/bakedinweston/contact.env
fi
rsync -a --delete --exclude test.mjs "$SRC/server/" "$APP/"   # includes node_modules from the bundle
chown -R "$DEPLOY_USER": "$APP"
CERT_STATE=

# ===========================================================================
setup_host() {
  apt_need certbot
  nginx -t >/dev/null 2>&1 || die "nginx config is already broken before our changes (nginx -t fails). No changes made."
  if [ -d /etc/nginx/sites-enabled ]; then
    AVAIL=/etc/nginx/sites-available; ENABLED=/etc/nginx/sites-enabled; LINK=1
  else
    AVAIL=/etc/nginx/conf.d; ENABLED=/etc/nginx/conf.d; LINK=
  fi
  mkdir -p /etc/nginx/snippets "$AVAIL" /var/www/letsencrypt
  if grep -rqsE 'zone=biw_contact|\$biw_robots' /etc/nginx --exclude='bakedinweston*'; then
    die "another nginx config already uses biw_contact / biw_robots. No changes made."
  fi
  if grep -rqs "server_name[^;]*\b${DOMAIN//./\\.}\b" /etc/nginx --exclude='bakedinweston*'; then
    die "another nginx config already serves $DOMAIN. No changes made."
  fi

  say "nginx (host)"
  for f in "$SRC"/deploy/nginx/bakedinweston-*.inc; do install -m 644 "$f" /etc/nginx/snippets/; done
  local full="$SRC/deploy/nginx/$CONF_NAME" target="$AVAIL/$CONF_NAME"
  reload_nginx() { if [ -n "$TEST_MODE" ]; then nginx -s reload; else systemctl reload nginx; fi; }
  enable_conf() {
    install -m 644 "$1" "$target"
    if [ -n "$LINK" ]; then ln -sfn "$target" "$ENABLED/$CONF_NAME"; fi
    if ! nginx -t; then
      warn "nginx -t failed — removing our site config again"
      rm -f "$ENABLED/$CONF_NAME" "$target"
      nginx -t && reload_nginx
      die "nginx check failed, nothing changed for other sites"
    fi
    reload_nginx
  }
  local cert=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
  if [ ! -f "$cert" ]; then
    awk 'BEGIN{n=0} /^server \{/{n++} n<2{print}' "$full" \
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
  [ -f "$cert" ] && { enable_conf "$full"; CERT_STATE=ok; }

  say "Contact form service (systemd)"
  local node_ok=
  if command -v node >/dev/null; then
    [ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] && node_ok=1 \
      || warn "Node $(node -v) is older than 20 — not touching it; contact form service skipped"
  elif command -v apt-get >/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
    node_ok=1
  fi
  if [ -n "$(ss -ltnpH 'sport = :8787' 2>/dev/null | grep -v bakedinweston || true)" ] \
     && ! systemctl is-active --quiet bakedinweston-contact 2>/dev/null; then
    warn "port 8787 is used by another program — contact form service skipped"; node_ok=
  fi
  if [ -n "$node_ok" ]; then
    [ -d "$APP/node_modules" ] || (cd "$APP" && npm ci --omit=dev --no-audit --no-fund --silent)
    chown -R "$DEPLOY_USER": "$APP"
    sed "s#/usr/bin/node#$(command -v node)#" "$SRC/deploy/bakedinweston-contact.service" > /etc/systemd/system/bakedinweston-contact.service
    if [ -z "$TEST_MODE" ]; then
      systemctl daemon-reload
      systemctl enable --now bakedinweston-contact >/dev/null
      systemctl restart bakedinweston-contact
    fi
  fi
}

# ===========================================================================
setup_docker() {
  local px="$PROXY"
  docker exec "$px" nginx -t >/dev/null 2>&1 || die "the proxy's nginx config is already broken (nginx -t in $px fails). No changes made."

  mount_of() {   # $1 = path inside the proxy -> "type|name|source"
    docker inspect "$px" --format '{{range .Mounts}}{{if eq .Destination "'"$1"'"}}{{.Type}}|{{.Name}}|{{.Source}}{{end}}{{end}}'
  }
  local confd le net acme_root web
  confd="$(mount_of /etc/nginx/conf.d | cut -d'|' -f3)"
  [ -n "$confd" ] && [ -d "$confd" ] || die "can't find the proxy's conf.d folder on the host (no bind mount of /etc/nginx/conf.d)"
  le="$(mount_of /etc/letsencrypt)"
  [ -n "$le" ] || die "the proxy has no /etc/letsencrypt mount — don't know where its certificates live"
  net="$(docker inspect "$px" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' | head -1)"
  [ -n "$net" ] || die "can't find the proxy's Docker network"
  acme_root="$(grep -rhoE 'acme-challenge/?[^}]*root[[:space:]]+[^;]+' "$confd" 2>/dev/null | head -1 | sed -E 's/.*root[[:space:]]+//')"
  acme_root="${acme_root:-/var/www/certbot}"
  web="$(mount_of "$acme_root")"
  [ -n "$web" ] || die "the proxy serves ACME challenges from $acme_root, but that folder is not a mount — can't get a certificate"
  vol() { local t n s; IFS='|' read -r t n s <<<"$1"; if [ "$t" = volume ]; then echo "$n"; else echo "$s"; fi; }
  local le_src web_src
  le_src="$(vol "$le")"; web_src="$(vol "$web")"
  echo "proxy conf.d: $confd | certificates: $le_src | ACME webroot: $acme_root ($web_src) | network: $net"

  if grep -rqs "server_name[^;]*\b${DOMAIN//./\\.}\b" "$confd" --exclude='bakedinweston*'; then
    die "the proxy already has a config for $DOMAIN. No changes made."
  fi
  for c in biw-web biw-contact; do
    if docker ps -a --format '{{.Names}}' | grep -qx "$c" \
       && [ "$(docker inspect "$c" --format '{{index .Config.Labels "biw.owner"}}')" != bakedinweston ]; then
      die "a container named $c exists and is not ours. No changes made."
    fi
  done

  say "Containers biw-web + biw-contact (network $net)"
  local cfg=/opt/bakedinweston/nginx
  mkdir -p "$cfg/conf.d" "$cfg/snippets"
  install -m 644 "$SRC/deploy/docker/biw-web.conf" "$cfg/conf.d/biw-web.conf"
  install -m 644 "$SRC/deploy/nginx/bakedinweston-headers.inc" "$SRC/deploy/nginx/bakedinweston-ssl.inc" "$cfg/snippets/"
  # Same site rules as on a normal server; the form service is the biw-contact container
  sed -e 's#    proxy_pass http://127.0.0.1:8787;#    set $biw_api http://biw-contact:8787;\n    proxy_pass $biw_api;#' \
    "$SRC/deploy/nginx/bakedinweston-site.inc" > "$cfg/snippets/bakedinweston-site.inc"
  grep -q 'biw-contact:8787' "$cfg/snippets/bakedinweston-site.inc" || die "could not adapt the site config for Docker"

  docker rm -f biw-contact biw-web >/dev/null 2>&1 || true
  docker run -d --name biw-contact --restart unless-stopped --network "$net" \
    --label biw.owner=bakedinweston \
    --env-file /etc/bakedinweston/contact.env -e HOST=0.0.0.0 -e PORT=8787 \
    -v "$APP:/app" -w /app \
    node:22-alpine sh -c '[ -d node_modules ] || npm ci --omit=dev --no-audit --no-fund; exec node contact-server.mjs' >/dev/null
  docker run -d --name biw-web --restart unless-stopped --network "$net" \
    --label biw.owner=bakedinweston \
    -v "$SITE:$SITE:ro" \
    -v "$cfg/conf.d:/etc/nginx/conf.d:ro" -v "$cfg/snippets:/etc/nginx/snippets:ro" \
    nginx:1.27-alpine >/dev/null
  sleep 2
  docker exec biw-web nginx -t >/dev/null 2>&1 || { docker logs biw-web 2>&1 | tail -5; die "biw-web nginx config failed"; }
  docker ps --filter label=biw.owner=bakedinweston --format '{{.Names}}: {{.Status}}'

  say "Proxy config ($confd/bakedinweston.conf)"
  local target="$confd/bakedinweston.conf"
  render() {
    sed -e "s#__DOMAIN__#$DOMAIN#g" -e "s#__ACME_ROOT__#$acme_root#g" -e "s#__PROXY__#$px#g" "$SRC/deploy/docker/proxy-site.conf"
  }
  apply_proxy_conf() {   # $1 = file; check with nginx -t, keep only if OK
    local backup=
    [ -f "$target" ] && { backup="$(mktemp)"; cp "$target" "$backup"; }
    install -m 644 "$1" "$target"
    if ! docker exec "$px" nginx -t; then
      warn "nginx -t failed in $px — restoring the previous state"
      if [ -n "$backup" ]; then cp "$backup" "$target"; else rm -f "$target"; fi
      die "proxy check failed; the proxy was not reloaded, other sites are unaffected"
    fi
    docker exec "$px" nginx -s reload
  }
  local have_cert
  have_cert="$(docker exec "$px" sh -c "[ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ] && echo yes || true")"
  if [ "$have_cert" != yes ]; then
    # Step 1: HTTP only — the site over http + the ACME challenge, so the certificate can be issued
    render | awk '/#BIW_HTTPS_START/{exit} {print}' \
      | sed 's#^    location / { return 301 https://$host$request_uri; }   \#BIW_HTTP_LOCATION#    location / { resolver 127.0.0.11 valid=30s ipv6=off; set $biw_upstream http://biw-web:80; proxy_pass $biw_upstream; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; client_max_body_size 6m; }#' \
      > /tmp/biw-proxy-http.conf
    grep -q 'proxy_pass $biw_upstream' /tmp/biw-proxy-http.conf || die "could not build the HTTP-only proxy config"
    apply_proxy_conf /tmp/biw-proxy-http.conf

    say "HTTPS certificate (certbot container)"
    if [ -n "$TEST_MODE" ]; then
      warn "test mode: self-signed certificate instead of Let's Encrypt"
      local tmpc; tmpc="$(mktemp -d)"
      openssl req -x509 -newkey rsa:2048 -nodes -days 2 -subj "/CN=$DOMAIN" -keyout "$tmpc/privkey.pem" -out "$tmpc/fullchain.pem" 2>/dev/null
      docker run --rm -v "$le_src:/etc/letsencrypt" -v "$tmpc:/src:ro" --entrypoint sh nginx:1.27-alpine -c \
        "mkdir -p /etc/letsencrypt/live/$DOMAIN && cp /src/*.pem /etc/letsencrypt/live/$DOMAIN/"
      rm -rf "$tmpc"
    else
      local try
      for try in 1 2 3; do
        if docker run --rm -v "$le_src:/etc/letsencrypt" -v "$web_src:$acme_root" certbot/certbot \
             certonly --webroot -w "$acme_root" -d "$DOMAIN" \
             --non-interactive --agree-tos --register-unsafely-without-email; then
          break
        fi
        [ "$try" -lt 3 ] && { echo "certbot attempt $try failed, retrying in 60 s"; sleep 60; }
      done
    fi
    have_cert="$(docker exec "$px" sh -c "[ -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem ] && echo yes || true")"
  fi
  if [ "$have_cert" = yes ]; then
    render > /tmp/biw-proxy-full.conf
    apply_proxy_conf /tmp/biw-proxy-full.conf
    CERT_STATE=ok
  else
    # Keep going: the site works over http; HTTPS can be added later by running the setup again
    warn "no certificate yet — the site works over http://$DOMAIN. Run the setup again later for HTTPS."
    echo "::warning::HTTPS certificate not issued yet (see certbot output above). The site works over http://$DOMAIN; run 'Setup staging server' again later."
  fi

  if [ -z "$TEST_MODE" ] && [ -n "$CERT_STATE" ]; then
    # Renew our certificate weekly (only ours) and reload the proxy
    cat > /etc/cron.d/bakedinweston-cert <<CRON
# Renew the bakedinweston staging certificate (added by setup-staging.sh)
17 4 * * 1 root docker run --rm -v $le_src:/etc/letsencrypt -v $web_src:$acme_root certbot/certbot renew --cert-name $DOMAIN -q && docker exec $px nginx -s reload
CRON
  fi
}

# ===========================================================================
if [ "$MODE" = host ]; then setup_host; else setup_docker; fi

say "Deploy permissions"
install -m 755 "$SRC/biw-restart-contact" /usr/local/bin/biw-restart-contact
if [ "$DEPLOY_USER" != root ]; then
  echo "$DEPLOY_USER ALL=(root) NOPASSWD: /usr/local/bin/biw-restart-contact" > /tmp/biw-sudoers
  visudo -cf /tmp/biw-sudoers >/dev/null && install -m 440 /tmp/biw-sudoers /etc/sudoers.d/bakedinweston-deploy
fi

say "Done"
if [ -n "$CERT_STATE" ]; then echo "Preview: https://$DOMAIN"; else echo "Preview: http://$DOMAIN (HTTPS after the certificate step succeeds)"; fi
