#!/bin/bash

# XサーバーVPS 自動デプロイスクリプト
# Usage: ./xserver-deploy.sh [VPS_IP] [DOMAIN_NAME]

set -e

# 設定
VPS_IP=${1:-"your-vps-ip"}
DOMAIN_NAME=${2:-"your-domain.com"}
APP_NAME="kakeibo-server"
DEPLOY_PATH="/var/www/kakeibo"
DB_NAME="kakeibo_db"
DB_USER="kakeibo_user"

echo "🚀 XサーバーVPSへのデプロイを開始します..."
echo "VPS IP: $VPS_IP"
echo "ドメイン: $DOMAIN_NAME"

# 1. ローカルでの準備
echo "📦 ローカルファイルの準備中..."
npm install --production
tar -czf kakeibo-app.tar.gz --exclude=node_modules --exclude=.git .

# 2. VPSサーバーへファイル転送
echo "📤 ファイルをVPSサーバーに転送中..."
scp kakeibo-app.tar.gz root@$VPS_IP:/tmp/
scp xserver-setup.sh root@$VPS_IP:/tmp/

# 3. VPSサーバーでセットアップ実行
echo "⚙️  VPSサーバーでセットアップを実行中..."
ssh root@$VPS_IP "chmod +x /tmp/xserver-setup.sh && /tmp/xserver-setup.sh $DOMAIN_NAME"

# 4. 完了通知
echo "✅ デプロイが完了しました！"
echo "🌐 アクセスURL: https://$DOMAIN_NAME"
echo "🔗 API健康チェック: https://$DOMAIN_NAME/api/health"

# クリーンアップ
rm -f kakeibo-app.tar.gz

echo "🎉 デプロイ完了！"