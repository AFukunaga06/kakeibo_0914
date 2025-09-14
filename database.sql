-- 家計簿データベース作成スクリプト

-- データベース作成
CREATE DATABASE IF NOT EXISTS kakeibo_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE kakeibo_db;

-- 支出テーブル作成
CREATE TABLE IF NOT EXISTS expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    date DATE NOT NULL,
    category VARCHAR(50) NOT NULL,
    product VARCHAR(255) NOT NULL,
    store VARCHAR(255) NOT NULL,
    amount INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- インデックス作成（検索性能向上）
CREATE INDEX idx_date ON expenses(date);
CREATE INDEX idx_category ON expenses(category);

-- サンプルデータ挿入（テスト用）
INSERT INTO expenses (date, category, product, store, amount) VALUES
('2024-01-15', '食費', 'パン', 'セブンイレブン', 150),
('2024-01-15', '交通費', '電車賃', 'JR東日本', 320),
('2024-01-16', '日用品', 'シャンプー', 'ドラッグストア', 800);

-- データ確認クエリ
SELECT * FROM expenses ORDER BY date DESC;