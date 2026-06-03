#!/usr/bin/env bash
set -euo pipefail

PUBLIC_HOST="${PUBLIC_HOST:-sysrev2.cs.binghamton.edu}"
RMS_UPSTREAM="${RMS_UPSTREAM:-http://127.0.0.1:3005}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-vkapse@binghamton.edu}"
ENABLE_HTTPS="${ENABLE_HTTPS:-1}"

if [[ "${EUID}" -ne 0 ]]; then
  exec sudo PUBLIC_HOST="$PUBLIC_HOST" RMS_UPSTREAM="$RMS_UPSTREAM" CERTBOT_EMAIL="$CERTBOT_EMAIL" ENABLE_HTTPS="$ENABLE_HTTPS" bash "$0" "$@"
fi

timestamp="$(date +%Y%m%d-%H%M%S)"

RMS_LOCATION_BLOCK="$(cat <<'NGINX_RMS_BLOCK'
    location = /rms {
        return 301 /rms/;
    }

    location /rms/ {
        rewrite ^/rms(/.*)$ $1 break;
        proxy_pass __RMS_UPSTREAM__;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

NGINX_RMS_BLOCK
)"
RMS_LOCATION_BLOCK="${RMS_LOCATION_BLOCK/__RMS_UPSTREAM__/$RMS_UPSTREAM}"

reload_nginx() {
  if command -v systemctl >/dev/null 2>&1; then
    systemctl reload nginx
  else
    service nginx reload
  fi
}

patch_nginx_server_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo "Skipping missing nginx file: $file"
    return 0
  fi

  if grep -q 'location /rms/' "$file"; then
    echo "Already has /rms route: $file"
    return 0
  fi

  cp "$file" "$file.bak-rms-$timestamp"

  local tmp
  tmp="$(mktemp)"
  awk -v block="$RMS_LOCATION_BLOCK" '
    !inserted && /^[[:space:]]*location[[:space:]]+\/[[:space:]]*\{/ {
      printf "%s", block
      inserted=1
    }
    { print }
    END { if (!inserted) exit 7 }
  ' "$file" > "$tmp"

  install -m 0644 "$tmp" "$file"
  rm -f "$tmp"
  echo "Patched $file; backup is $file.bak-rms-$timestamp"
}

patch_nginx_server_file /etc/nginx/sites-available/default
patch_nginx_server_file /etc/nginx/sites-available/my-app.conf

nginx -t
reload_nginx

if [[ "$ENABLE_HTTPS" == "1" ]]; then
  if ! command -v certbot >/dev/null 2>&1; then
    if command -v apt-get >/dev/null 2>&1; then
      apt-get update
      apt-get install -y certbot python3-certbot-nginx
    else
      echo "certbot is not installed and no apt-get was found; skipping HTTPS setup."
      exit 0
    fi
  fi

  certbot --nginx \
    -d "$PUBLIC_HOST" \
    --redirect \
    --non-interactive \
    --agree-tos \
    -m "$CERTBOT_EMAIL"

  nginx -t
  reload_nginx
fi

echo "RMS should now be available at:"
echo "  https://$PUBLIC_HOST/rms/"
