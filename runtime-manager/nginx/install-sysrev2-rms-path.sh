#!/usr/bin/env bash
set -euo pipefail

PUBLIC_HOST="${PUBLIC_HOST:-sysrev2.cs.binghamton.edu}"
RMS_UPSTREAM="${RMS_UPSTREAM:-http://127.0.0.1:3005}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-vkapse@binghamton.edu}"
ENABLE_HTTPS="${ENABLE_HTTPS:-1}"
ENABLE_SELF_SIGNED_HTTPS="${ENABLE_SELF_SIGNED_HTTPS:-0}"
RMS_CONF_FILE="${RMS_CONF_FILE:-/etc/nginx/conf.d/rms.conf}"

if [[ "${EUID}" -ne 0 ]]; then
  exec sudo \
    PUBLIC_HOST="$PUBLIC_HOST" \
    RMS_UPSTREAM="$RMS_UPSTREAM" \
    CERTBOT_EMAIL="$CERTBOT_EMAIL" \
    ENABLE_HTTPS="$ENABLE_HTTPS" \
    ENABLE_SELF_SIGNED_HTTPS="$ENABLE_SELF_SIGNED_HTTPS" \
    RMS_CONF_FILE="$RMS_CONF_FILE" \
    bash "$0" "$@"
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
      printf "%s\n", block
      inserted=1
    }
    { print }
    END { if (!inserted) exit 7 }
  ' "$file" > "$tmp"

  install -m 0644 "$tmp" "$file"
  rm -f "$tmp"
  echo "Patched $file; backup is $file.bak-rms-$timestamp"
}

nginx_conf_has_include() {
  grep -Eq "^[[:space:]]*include[[:space:]]+$1;" /etc/nginx/nginx.conf
}

write_conf_d_server() {
  if [[ -f "$RMS_CONF_FILE" ]]; then
    cp "$RMS_CONF_FILE" "$RMS_CONF_FILE.bak-rms-$timestamp"
  fi

  {
    cat <<NGINX_RMS_HTTP
server {
    listen 80;
    listen [::]:80;
    server_name $PUBLIC_HOST;

    client_max_body_size 500M;
NGINX_RMS_HTTP
    emit_rms_locations
    cat <<'NGINX_RMS_HTTP_END'
}
NGINX_RMS_HTTP_END

    if [[ "$ENABLE_SELF_SIGNED_HTTPS" == "1" ]]; then
      cat <<NGINX_RMS_HTTPS

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $PUBLIC_HOST;

    ssl_certificate /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;

    client_max_body_size 500M;
NGINX_RMS_HTTPS
      emit_rms_locations
      cat <<'NGINX_RMS_HTTPS_END'
}
NGINX_RMS_HTTPS_END
    fi
  } > "$RMS_CONF_FILE"

  echo "Wrote $RMS_CONF_FILE"
}

emit_rms_locations() {
  cat <<NGINX_RMS_LOCATIONS
    location = /rms {
        return 301 /rms/;
    }

    location /rms/ {
        rewrite ^/rms(/.*)$ \$1 break;
        proxy_pass $RMS_UPSTREAM;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
NGINX_RMS_LOCATIONS
}

if nginx_conf_has_include "/etc/nginx/conf.d/\\*.conf"; then
  write_conf_d_server
fi

if nginx_conf_has_include "/etc/nginx/sites-enabled/\\*"; then
  patch_nginx_server_file /etc/nginx/sites-available/default
  patch_nginx_server_file /etc/nginx/sites-available/my-app.conf
fi

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
