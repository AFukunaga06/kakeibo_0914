#!/bin/bash

# XサーバーVPS セットアップスクリプト（VPS上で実行）
# このスクリプトはVPSサーバー上で実行されます

set -e

DOMAIN_NAME=${1:-"your-domain.com"}
APP_NAME="kakeibo-server"
DEPLOY_PATH="/var/www/kakeibo"
DB_NAME="kakeibo_db"
DB_USER="kakeibo_user"
DB_PASSWORD=$(openssl rand -base64 32)

echo "🔧 XサーバーVPS環境構築を開始..."

# 1. システム更新とパッケージインストール
echo "📦 システム更新とパッケージインストール..."
if command -v yum &> /dev/null; then
    # CentOS/RHEL
    yum update -y
    yum install -y curl wget
    # Node.js インストール
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
    # MySQL インストール
    yum install -y mysql-server
    # Nginx インストール
    yum install -y nginx
elif command -v apt &> /dev/null; then
    # Ubuntu/Debian
    apt update && apt upgrade -y
    apt install -y curl wget
    # Node.js インストール
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    # MySQL インストール
    apt install -y mysql-server
    # Nginx インストール
    apt install -y nginx
fi

# 2. PM2インストール
echo "🚀 PM2インストール..."
npm install -g pm2

# 3. MySQL設定
echo "🗄️  MySQL設定..."
systemctl start mysqld || systemctl start mysql
systemctl enable mysqld || systemctl enable mysql

# MySQL root パスワード設定（初回のみ）
if [ ! -f /var/lib/mysql/.mysql_configured ]; then
    MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)

    # MySQL初期設定
    mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';" || true

    # 設定ファイルに保存
    cat > /root/.mysql_credentials << EOF
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
DB_PASSWORD=$DB_PASSWORD
EOF
    chmod 600 /root/.mysql_credentials

    touch /var/lib/mysql/.mysql_configured
else
    # 既存の設定読み込み
    source /root/.mysql_credentials
fi

# データベースとユーザー作成
mysql -u root -p$MYSQL_ROOT_PASSWORD << EOF
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
EOF

# 4. アプリケーションデプロイ
echo "📱 アプリケーションデプロイ..."
mkdir -p $DEPLOY_PATH
cd $DEPLOY_PATH

# 既存のアプリケーション停止
pm2 stop $APP_NAME || true
pm2 delete $APP_NAME || true

# 新しいファイル展開
tar -xzf /tmp/kakeibo-app.tar.gz -C $DEPLOY_PATH

# 環境設定ファイル作成
cat > .env << EOF
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
PORT=3000
NODE_ENV=production
EOF

chmod 600 .env

# 依存関係インストール
npm install --production

# データベーステーブル作成
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < database.sql

# ログディレクトリ作成
mkdir -p logs

# 5. PM2でアプリケーション起動
echo "🚀 アプリケーション起動..."
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save

# 6. Nginx設定
echo "🌐 Nginx設定..."
cat > /etc/nginx/conf.d/kakeibo.conf << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Nginx設定テストと起動
nginx -t
systemctl start nginx
systemctl enable nginx

# 7. ファイアウォール設定
echo "🔒 ファイアウォール設定..."
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
elif command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow ssh
    ufw --force enable
fi

# 8. SSL証明書設定
echo "🔐 SSL証明書設定..."
if command -v yum &> /dev/null; then
    yum install -y certbot python3-certbot-nginx
elif command -v apt &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
fi

# SSL証明書取得（インタラクティブ）
echo "📜 SSL証明書を取得します..."
certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME || {
    echo "⚠️  SSL証明書の自動取得に失敗しました。手動で設定してください："
    echo "certbot --nginx -d $DOMAIN_NAME"
}

# 自動更新設定
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# 9. 動作確認
echo "🧪 動作確認..."
sleep 5
curl -f http://localhost:3000/api/health && echo "✅ ローカルAPI接続OK"

echo "✅ セットアップ完了！"
echo "===================="
echo "🌐 アクセスURL: https://$DOMAIN_NAME"
echo "🔗 API健康チェック: https://$DOMAIN_NAME/api/health"
echo "📊 PM2監視: pm2 status"
echo "📝 ログ確認: pm2 logs $APP_NAME"
echo "🗄️  MySQL認証情報: cat /root/.mysql_credentials"
echo "===================="