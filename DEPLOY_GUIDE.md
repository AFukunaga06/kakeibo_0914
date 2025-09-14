# XサーバーVPS デプロイガイド

## 前提条件
- XサーバーVPSの契約済み
- SSH接続可能
- ドメインまたはIPアドレスでアクセス可能

## 1. VPSサーバーの準備

```bash
# サーバーにSSH接続
ssh root@your-vps-ip

# システム更新
yum update -y  # CentOSの場合
# または
apt update && apt upgrade -y  # Ubuntuの場合

# Node.js インストール（NodeSource repository使用）
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -  # CentOS
sudo yum install -y nodejs

# または Ubuntu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MySQL インストールと設定
yum install -y mysql-server  # CentOS
# または
apt install -y mysql-server  # Ubuntu

# MySQL起動・自動起動設定
systemctl start mysqld
systemctl enable mysqld

# PM2 インストール（プロセス管理）
npm install -g pm2
```

## 2. データベース設定

```bash
# MySQL セキュリティ設定
mysql_secure_installation

# MySQL接続
mysql -u root -p

# データベース・ユーザー作成
CREATE DATABASE kakeibo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'kakeibo_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON kakeibo_db.* TO 'kakeibo_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# テーブル作成
mysql -u kakeibo_user -p kakeibo_db < database.sql
```

## 3. アプリケーションデプロイ

```bash
# アプリケーション用ディレクトリ作成
mkdir -p /var/www/kakeibo
cd /var/www/kakeibo

# ファイル転送（ローカルから実行）
scp -r kakeibo_02/* root@your-vps-ip:/var/www/kakeibo/

# VPSサーバーで続行
cd /var/www/kakeibo

# 環境設定ファイル作成
cp .env.example .env
nano .env

# .envファイルの内容を編集
DB_HOST=localhost
DB_USER=kakeibo_user
DB_PASSWORD=secure_password_here
DB_NAME=kakeibo_db
PORT=3000
NODE_ENV=production

# 依存関係インストール
npm install --production

# ログディレクトリ作成
mkdir logs

# PM2でアプリケーション起動
pm2 start ecosystem.config.js --env production

# PM2自動起動設定
pm2 startup
pm2 save
```

## 4. Nginx設定（リバースプロキシ）

```bash
# Nginx インストール
yum install -y nginx  # CentOS
# または
apt install -y nginx  # Ubuntu

# 設定ファイル編集
nano /etc/nginx/conf.d/kakeibo.conf
```

Nginx設定内容:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Nginx設定テスト
nginx -t

# Nginx起動・自動起動設定
systemctl start nginx
systemctl enable nginx

# ファイアウォール設定
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

## 5. SSL証明書設定（Let's Encrypt）

```bash
# Certbot インストール
yum install -y certbot python3-certbot-nginx  # CentOS
# または
apt install -y certbot python3-certbot-nginx  # Ubuntu

# SSL証明書取得
certbot --nginx -d your-domain.com

# 自動更新設定
crontab -e
# 以下を追加
0 12 * * * /usr/bin/certbot renew --quiet
```

## 6. 動作確認

```bash
# プロセス確認
pm2 status
pm2 logs kakeibo-server

# データベース接続確認
curl http://localhost:3000/api/health

# 外部からアクセステスト
curl https://your-domain.com/api/health
```

## 7. 保守・運用

```bash
# ログ確認
pm2 logs

# アプリケーション再起動
pm2 restart kakeibo-server

# アプリケーション停止
pm2 stop kakeibo-server

# データベースバックアップ
mysqldump -u kakeibo_user -p kakeibo_db > backup_$(date +%Y%m%d).sql
```

## トラブルシューティング

1. **データベース接続エラー**
   - `.env`ファイルの設定確認
   - MySQLサービス状態確認: `systemctl status mysqld`

2. **ポート3000が使用中**
   - 使用中のプロセス確認: `lsof -i :3000`
   - 必要に応じてプロセス終了

3. **Nginx設定エラー**
   - 設定ファイルチェック: `nginx -t`
   - ログ確認: `tail -f /var/log/nginx/error.log`

## セキュリティ注意点
- MySQL rootパスワードを強力にする
- `.env`ファイルの権限を制限: `chmod 600 .env`
- 定期的なシステム更新
- 不要なポートを閉じる
- 定期的なバックアップ