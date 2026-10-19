# Shared rules for bakedinweston.com (included by the production and test server blocks).
# Site files: /var/www/bakedinweston/current  (a symlink to the latest release, see scripts/deploy.sh)

root /var/www/bakedinweston/current;
index index.html;
charset utf-8;
server_tokens off;

# --- Compression ---
gzip on;
gzip_vary on;
gzip_comp_level 6;
gzip_min_length 512;
gzip_types text/plain text/css text/xml application/xml application/javascript application/json image/svg+xml application/manifest+json;
# Brotli: uncomment if the ngx_brotli module is installed (apt install libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static)
# brotli on;
# brotli_comp_level 5;
# brotli_types text/plain text/css text/xml application/xml application/javascript application/json image/svg+xml application/manifest+json;

# --- Security headers ---
include snippets/bakedinweston-headers.inc;

error_page 404 /404.html;

# --- Old GoDaddy store/account pages (/shop*, /m/*) ---
# No redirects for now (owner's decision): they return the 404 page.
# To redirect later, uncomment:
# location ^~ /shop { return 301 /; }
# location = /m      { return 301 /; }
# location ^~ /m/    { return 301 /; }

# --- Clean URLs: /faq serves faq.html; /faq.html and /faq/ redirect to /faq ---
location ~ ^/(?<biw_page>.+)\.html$ {
    if ($biw_page = "404") { return 404; }
    if ($biw_page = "index") { return 301 /$is_args$args; }
    return 301 /$biw_page$is_args$args;
}
location ~ ^/(?<biw_dir>.+)/$ {
    return 301 /$biw_dir$is_args$args;
}
location = /index { return 301 /; }

location / {
    try_files $uri $uri.html $uri/index.html =404;
    # HTML: always revalidate so a new deploy shows up right away
    add_header Cache-Control "no-cache" always;
    include snippets/bakedinweston-headers.inc;
}

location = /404.html {
    internal;
    add_header Cache-Control "no-cache" always;
    include snippets/bakedinweston-headers.inc;
}

# Hashed build files (CSS, JS, images): cache for a year
location ^~ /_astro/ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    include snippets/bakedinweston-headers.inc;
    try_files $uri =404;
}

# Icons, manifest: cache for a week
location ~* ^/(favicon\.ico|favicon-48\.png|apple-touch-icon\.png|icon-\d+\.png|site\.webmanifest)$ {
    add_header Cache-Control "public, max-age=604800" always;
    include snippets/bakedinweston-headers.inc;
    try_files $uri =404;
}

location = /robots.txt  { add_header Cache-Control "public, max-age=3600" always; include snippets/bakedinweston-headers.inc; try_files $uri =404; }
location = /sitemap.xml { add_header Cache-Control "public, max-age=3600" always; include snippets/bakedinweston-headers.inc; try_files $uri =404; }

# --- Contact form -> Node service (deploy/bakedinweston-contact.service) ---
location = /api/contact {
    limit_req zone=biw_contact burst=5 nodelay;
    limit_req_status 429;
    client_max_body_size 6m;
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 30s;
}

# Hidden files
location ~ /\. { deny all; }
