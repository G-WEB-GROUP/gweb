#!/usr/bin/env bash
# Read-only check of the contact form service (run as root on the server; used by the
# "Diagnose contact form" workflow). Changes nothing. Never prints the SMTP password or
# visitors' email addresses.
set -u

echo "== Container"
docker ps -a --filter name=biw-contact --format '{{.Names}}: {{.Status}}'

echo; echo "== Settings in /etc/bakedinweston/contact.env (password hidden)"
if [ -f /etc/bakedinweston/contact.env ]; then
  grep -E '^[A-Z_]+=' /etc/bakedinweston/contact.env \
    | sed -E 's/^(SMTP_PASS)=.+$/\1=(set, hidden)/; s/^(SMTP_PASS)=$/\1=(EMPTY)/'
  # Common mistakes: quotes or spaces around values
  grep -nE '^[A-Z_]+= |^[A-Z_]+ =|="|='"'" /etc/bakedinweston/contact.env >/dev/null \
    && echo "WARNING: quotes or spaces around a value — remove them (docker reads them literally)"
else
  echo "MISSING"
fi

echo; echo "== Settings the running container actually uses"
docker exec biw-contact sh -c 'for v in SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER MAIL_FROM MAIL_TO; do eval "echo $v=\${$v}"; done; [ -n "$SMTP_PASS" ] && echo "SMTP_PASS=(set)" || echo "SMTP_PASS=(EMPTY)"'

echo; echo "== SMTP login test with these settings, and with the other common port"
docker exec -w /app biw-contact node -e '
const nm = require("nodemailer");
const base = { host: process.env.SMTP_HOST, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, connectionTimeout: 15000, greetingTimeout: 15000 };
const tries = [
  ["configured", { port: Number(process.env.SMTP_PORT), secure: process.env.SMTP_SECURE === "true" }],
  ["465 SSL", { port: 465, secure: true }],
  ["587 STARTTLS", { port: 587, secure: false }],
];
(async () => {
  if (!process.env.SMTP_HOST) return console.log("SMTP_HOST is empty: the container runs in log-only mode");
  for (const [name, opt] of tries) {
    try { await nm.createTransport({ ...base, ...opt }).verify(); console.log(`${name}: OK (login accepted)`); }
    catch (e) { console.log(`${name}: FAILED — ${e.code || ""} ${e.responseCode || ""} ${String(e.message).split("\n")[0]}`); }
  }
})();
'

echo; echo "== Last form log lines (emails hidden)"
docker logs --tail 40 biw-contact 2>&1 | grep '\[contact\]' | tail -15 \
  | sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/<email>/g'
