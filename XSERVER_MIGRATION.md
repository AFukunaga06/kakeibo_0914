# XサーバーVPS 移行ガイド

## 概要
Devin.aiからXサーバーVPSへの家計簿アプリケーション移行手順

## 移行内容
- **アプリケーション**: Node.js + Express + MySQL家計簿アプリ
- **移行元**: Devin.ai開発環境
- **移行先**: XサーバーVPS
- **技術スタック**: Node.js 18+, MySQL 8.0+, Nginx, PM2, Let's Encrypt

## クイックスタート

### 1. 自動デプロイ（推奨）
```bash
# VPS IPとドメイン名を指定して実行
chmod +x xserver-deploy.sh
./xserver-deploy.sh your-vps-ip your-domain.com
```

### 2. 手動デプロイ
詳細な手順は [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) を参照

## 新規追加ファイル

### xserver-deploy.sh
- ローカルからVPSへの自動デプロイスクリプト
- ファイル圧縮・転送・VPSセットアップを自動化

### xserver-setup.sh
- VPS上で実行される環境構築スクリプト
- Node.js, MySQL, Nginx, SSL証明書の自動設定

### .env.xserver
- XサーバーVPS用の環境設定テンプレート
- 本番環境用の最適化された設定

## デプロイ前の準備

1. **VPS情報の確認**
   - IPアドレス
   - ドメイン名（SSL証明書用）
   - SSH接続情報

2. **ローカル設定**
   ```bash
   # SSH鍵設定（パスワードなし接続）
   ssh-copy-id root@your-vps-ip

   # 必要パッケージインストール
   npm install
   ```

## デプロイ実行

### 自動デプロイの場合
```bash
./xserver-deploy.sh 123.456.789.012 example.com
```

### 手動デプロイの場合
```bash
# 1. ファイル転送
scp -r * root@your-vps-ip:/tmp/kakeibo/

# 2. VPSでセットアップ
ssh root@your-vps-ip
cd /tmp/kakeibo
chmod +x xserver-setup.sh
./xserver-setup.sh your-domain.com
```

## デプロイ後の確認

1. **動作確認**
   ```bash
   curl https://your-domain.com/api/health
   ```

2. **PM2状態確認**
   ```bash
   ssh root@your-vps-ip "pm2 status"
   ```

3. **ログ確認**
   ```bash
   ssh root@your-vps-ip "pm2 logs kakeibo-server"
   ```

## 設定のカスタマイズ

### データベース設定
- `.env`ファイルでDB接続情報を変更
- MySQL認証情報は `/root/.mysql_credentials` に保存

### SSL証明書
- Let's Encryptによる自動取得
- 3ヶ月ごとの自動更新設定済み

### 監視・ログ
- PM2による プロセス監視
- アプリケーションログ: `/var/www/kakeibo/logs/`
- Nginxログ: `/var/log/nginx/`

## セキュリティ設定

1. **ファイアウォール**
   - HTTP(80), HTTPS(443), SSH(22)のみ開放

2. **データベース**
   - 強力なパスワード自動生成
   - localhost接続のみ許可

3. **アプリケーション**
   - 本番環境モードで実行
   - 環境変数による機密情報管理

## バックアップ

### データベースバックアップ
```bash
# 手動バックアップ
mysqldump -u kakeibo_user -p kakeibo_db > backup_$(date +%Y%m%d).sql

# 自動バックアップ設定（cron）
0 2 * * * mysqldump -u kakeibo_user -p[PASSWORD] kakeibo_db > /backup/kakeibo_$(date +\%Y\%m\%d).sql
```

## トラブルシューティング

### よくある問題

1. **SSL証明書エラー**
   ```bash
   certbot --nginx -d your-domain.com
   ```

2. **データベース接続エラー**
   ```bash
   systemctl status mysqld
   cat /root/.mysql_credentials
   ```

3. **PM2プロセスエラー**
   ```bash
   pm2 restart kakeibo-server
   pm2 logs kakeibo-server
   ```

## 運用・保守

### 定期メンテナンス
- システム更新: 月1回
- データベースバックアップ: 毎日
- ログローテーション: 週1回
- SSL証明書更新: 自動（3ヶ月ごと）

### 監視項目
- プロセス稼働状態
- メモリ使用量
- ディスク容量
- データベース接続数

## サポート

問題が発生した場合:
1. ログファイルを確認
2. PM2状態を確認
3. システムリソースを確認
4. 必要に応じてサービス再起動

---

**注意**: 本番環境運用前に必ずテスト環境での動作確認を行ってください。