const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア設定
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静的ファイル配信（HTML, CSS, JS）
app.use(express.static('.'));

// MySQL接続設定
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kakeibo_db',
    charset: 'utf8mb4'
};

// データベース接続プール作成
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// API Routes

// 全支出データ取得
app.get('/api/expenses', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM expenses ORDER BY date DESC'
        );
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('支出データ取得エラー:', error);
        res.status(500).json({
            success: false,
            message: 'データの取得に失敗しました'
        });
    }
});

// 新しい支出追加
app.post('/api/expenses', async (req, res) => {
    try {
        const { date, category, product, store, amount } = req.body;
        
        // バリデーション
        if (!date || !category || !product || !store || !amount) {
            return res.status(400).json({
                success: false,
                message: 'すべての項目を入力してください'
            });
        }

        const [result] = await pool.execute(
            'INSERT INTO expenses (date, category, product, store, amount) VALUES (?, ?, ?, ?, ?)',
            [date, category, product, store, parseInt(amount)]
        );

        res.json({
            success: true,
            data: {
                id: result.insertId,
                date,
                category,
                product,
                store,
                amount: parseInt(amount)
            },
            message: '支出を追加しました'
        });
    } catch (error) {
        console.error('支出追加エラー:', error);
        res.status(500).json({
            success: false,
            message: '支出の追加に失敗しました'
        });
    }
});

// 支出削除
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const expenseId = parseInt(req.params.id);
        
        const [result] = await pool.execute(
            'DELETE FROM expenses WHERE id = ?',
            [expenseId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: '指定された支出が見つかりません'
            });
        }

        res.json({
            success: true,
            message: '支出を削除しました'
        });
    } catch (error) {
        console.error('支出削除エラー:', error);
        res.status(500).json({
            success: false,
            message: '支出の削除に失敗しました'
        });
    }
});

// サーバー状態確認用エンドポイント
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'サーバーは正常に動作しています',
        timestamp: new Date().toISOString()
    });
});

// メインページ
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/kakei-app.html');
});

// データベース接続テスト
async function testDatabaseConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQLデータベースに接続しました');
        connection.release();
    } catch (error) {
        console.error('❌ データベース接続エラー:', error.message);
        console.log('⚠️  データベース設定を確認してください:');
        console.log(`   Host: ${dbConfig.host}`);
        console.log(`   User: ${dbConfig.user}`);
        console.log(`   Database: ${dbConfig.database}`);
    }
}

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 家計簿サーバーがポート${PORT}で起動しました`);
    console.log(`📱 ローカルアクセス: http://localhost:${PORT}`);
    console.log(`🌐 外部アクセス: http://219.104.132.116:${PORT}`);
    testDatabaseConnection();
});

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
    console.log('🔄 サーバーをシャットダウンしています...');
    await pool.end();
    process.exit(0);
});