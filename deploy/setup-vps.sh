#!/usr/bin/env bash
# Однократная подготовка VPS (Ubuntu/Debian). Запускать от root:  sudo bash setup-vps.sh
# Скрипт можно запускать повторно — он ничего не ломает.
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-deploy}"
WEB_ROOT="${WEB_ROOT:-/var/www/sorbentopt}"

[ "$(id -u)" -eq 0 ] || { echo "Запустите от root: sudo bash $0"; exit 1; }

# 1. Пользователь только для выкладки сайта (без пароля, вход по SSH-ключу).
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"

# 2. Каталоги сайта. Владелец — deploy, читать может любой (Caddy работает от пользователя caddy).
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$WEB_ROOT" "$WEB_ROOT/releases"

# 3. Первая заглушка, чтобы Caddy стартовал до первой выкладки.
if [ ! -e "$WEB_ROOT/current" ]; then
  install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$WEB_ROOT/releases/00000000-000000-initial"
  echo '<!doctype html><meta charset="utf-8"><title>Сайт скоро откроется</title><p>Сайт скоро откроется.' \
    > "$WEB_ROOT/releases/00000000-000000-initial/index.html"
  chown "$DEPLOY_USER:$DEPLOY_USER" "$WEB_ROOT/releases/00000000-000000-initial/index.html"
  sudo -u "$DEPLOY_USER" ln -sfn "releases/00000000-000000-initial" "$WEB_ROOT/current"
fi

cat <<MSG

Готово. Осталось:
  1. Добавить публичный SSH-ключ в /home/$DEPLOY_USER/.ssh/authorized_keys
     (ключ создаёт приложение: Настройки → Сервер → «Создать SSH-ключ»).
  2. Установить Caddy (https://caddyserver.com/docs/install) и положить Caddyfile из репозитория
     в /etc/caddy/Caddyfile, затем:  systemctl reload caddy
  3. В DNS домена указать A-запись на IP этого сервера.
MSG
