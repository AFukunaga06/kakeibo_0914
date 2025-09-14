# 家計簿アプリ - サーバー版

田中さんが編集したデータを佐藤さんが別のPCで閲覧できる、共有型の家計簿アプリです。

## 機能
- ✅ **データ共有**: 複数のユーザーで同じデータを共有
- ✅ **リアルタイム更新**: データの追加・削除が即座に反映
- ✅ **パスワード認証**: 読み取り専用・編集可能の2つのモード
- ✅ **レスポンシブデザイン**: PC・スマホ対応

## システム構成

```
フロントエンド (HTML/CSS/JavaScript)
           ↓ API通信
バックエンド (Node.js + Express)
           ↓ データ操作
データベース (MySQL)
```

## パスワード
- **読み取り専用**: `0317`
- **編集可能**: `r246`

## ローカル開発

### 必要な環境
- Node.js 18+
- MySQL 8.0+

### セットアップ
```bash
# 依存関係インストール
npm install

# 環境設定
cp .env.example .env
# .envファイルを編集してデータベース接続情報を設定

# データベースセットアップ
mysql -u root -p < database.sql

# 開発サーバー起動
npm run dev
```

### アクセス
http://localhost:3000

## XサーバーVPSデプロイ

詳細は [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) を参照してください。

### デプロイ概要
1. VPSにNode.js + MySQL環境構築
2. データベース・ユーザー作成
3. アプリケーションファイル転送
4. PM2でプロセス管理
5. Nginxでリバースプロキシ設定
6. SSL証明書設定（Let's Encrypt）

## API仕様

### 支出データ取得
```http
GET /api/expenses
```

### 支出データ追加
```http
POST /api/expenses
Content-Type: application/json

{
  "date": "2024-01-15",
  "category": "食費",
  "product": "パン",
  "store": "セブンイレブン",
  "amount": 150
}
```

### 支出データ削除
```http
DELETE /api/expenses/{id}
```

### サーバー状態確認
```http
GET /api/health
```

## データベース構造

```sql
CREATE TABLE expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    product VARCHAR(255) NOT NULL,
    store VARCHAR(255) NOT NULL,
    amount INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 変更履歴

### v2.0.0 (サーバー版)
- MySQL + Node.js/Express によるサーバーサイド実装
- 複数ユーザーでのデータ共有機能
- API による CRUD 操作

### v1.0.0 (クライアント版)  
- localStorage による個別データ管理
- パスワード認証機能
- レスポンシブデザイン

## ライセンス
ISC