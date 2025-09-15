// GAS家計簿アプリ - メインコード
// Google Apps Script で動作する家計簿アプリケーション

/**
 * WebアプリのHTMLページを表示
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('家計簿アプリ - GAS版')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * HTMLファイルの内容を読み込む（include用）
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * スプレッドシートを取得または作成
 */
function getOrCreateSpreadsheet() {
  const SPREADSHEET_NAME = '家計簿データ';

  // 既存のスプレッドシートを検索
  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);

  if (files.hasNext()) {
    const file = files.next();
    return SpreadsheetApp.openById(file.getId());
  }

  // 新規作成
  const spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
  const sheet = spreadsheet.getActiveSheet();

  // ヘッダー行を設定
  sheet.getRange(1, 1, 1, 6).setValues([
    ['ID', '日付', 'カテゴリ', '商品名', '店舗', '金額']
  ]);

  // ヘッダー行のスタイル設定
  const headerRange = sheet.getRange(1, 1, 1, 6);
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  headerRange.setFontWeight('bold');

  return spreadsheet;
}

/**
 * 支出データを取得
 */
function getExpenses() {
  try {
    const spreadsheet = getOrCreateSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: true, data: [] };
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

    const expenses = data
      .filter(row => row[0]) // IDが存在する行のみ
      .map(row => ({
        id: row[0],
        date: Utilities.formatDate(new Date(row[1]), 'Asia/Tokyo', 'yyyy-MM-dd'),
        category: row[2],
        product: row[3],
        store: row[4],
        amount: row[5]
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // 日付の降順

    return { success: true, data: expenses };

  } catch (error) {
    console.error('データ取得エラー:', error);
    return { success: false, message: 'データの取得に失敗しました: ' + error.toString() };
  }
}

/**
 * 支出データを追加
 */
function addExpense(expenseData) {
  try {
    const { date, category, product, store, amount } = expenseData;

    // バリデーション
    if (!date || !category || !product || !store || !amount) {
      return { success: false, message: 'すべての項目を入力してください' };
    }

    const spreadsheet = getOrCreateSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();

    // 新しいIDを生成（現在の最大ID + 1）
    const lastRow = sheet.getLastRow();
    let newId = 1;

    if (lastRow > 1) {
      const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues()
        .map(row => parseInt(row[0]) || 0);
      newId = Math.max(...ids) + 1;
    }

    // データを追加
    const newRow = lastRow + 1;
    sheet.getRange(newRow, 1, 1, 6).setValues([[
      newId,
      new Date(date),
      category,
      product,
      store,
      parseInt(amount)
    ]]);

    // 追加された行のスタイル設定
    const newRowRange = sheet.getRange(newRow, 1, 1, 6);
    newRowRange.setBorder(true, true, true, true, false, false);

    return {
      success: true,
      message: '支出データが追加されました',
      id: newId
    };

  } catch (error) {
    console.error('データ追加エラー:', error);
    return { success: false, message: 'データの追加に失敗しました: ' + error.toString() };
  }
}

/**
 * 支出データを削除
 */
function deleteExpense(id) {
  try {
    const spreadsheet = getOrCreateSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return { success: false, message: '削除するデータがありません' };
    }

    // IDに一致する行を検索
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

    for (let i = 0; i < data.length; i++) {
      if (data[i][0] == id) {
        const rowNumber = i + 2; // ヘッダー行を考慮
        sheet.deleteRow(rowNumber);

        return {
          success: true,
          message: '支出データが削除されました'
        };
      }
    }

    return { success: false, message: '指定されたデータが見つかりません' };

  } catch (error) {
    console.error('データ削除エラー:', error);
    return { success: false, message: 'データの削除に失敗しました: ' + error.toString() };
  }
}

/**
 * サーバー状態確認（ヘルスチェック）
 */
function healthCheck() {
  return {
    success: true,
    message: 'GAS家計簿サーバーは正常に動作しています',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
}

/**
 * 統計情報を取得
 */
function getStatistics() {
  try {
    const expenses = getExpenses();
    if (!expenses.success) {
      return expenses;
    }

    const data = expenses.data;
    const total = data.reduce((sum, expense) => sum + expense.amount, 0);
    const count = data.length;
    const average = count > 0 ? Math.round(total / count) : 0;

    // カテゴリ別集計
    const categoryTotals = {};
    data.forEach(expense => {
      if (categoryTotals[expense.category]) {
        categoryTotals[expense.category] += expense.amount;
      } else {
        categoryTotals[expense.category] = expense.amount;
      }
    });

    return {
      success: true,
      data: {
        total,
        count,
        average,
        categoryTotals
      }
    };

  } catch (error) {
    console.error('統計取得エラー:', error);
    return { success: false, message: '統計の取得に失敗しました: ' + error.toString() };
  }
}