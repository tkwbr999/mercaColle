// メルカコレ ポップアップスクリプト

class MercaCollePopup {
  constructor() {
    this.cardData = [];
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadData();
    this.updateUI();
  }

  setupEventListeners() {
    // カード情報取得ボタン
    document.getElementById('extract-btn').addEventListener('click', () => {
      this.extractCardData();
    });

    // ページ構造検査ボタン
    document.getElementById('inspect-btn').addEventListener('click', () => {
      this.inspectPage();
    });

    // CSVエクスポートボタン
    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportToCSV();
    });

    // データクリアボタン
    document.getElementById('clear-btn').addEventListener('click', () => {
      this.clearData();
    });
  }

  async loadData() {
    return new Promise(resolve => {
      chrome.storage.local.get(
        ['mercari_card_data', 'last_updated'],
        result => {
          this.cardData = result.mercari_card_data || [];
          this.lastUpdated = result.last_updated || null;
          resolve();
        }
      );
    });
  }

  updateUI() {
    // 最終更新時刻
    const lastUpdatedElement = document.getElementById('last-updated');
    if (this.lastUpdated) {
      const date = new Date(this.lastUpdated);
      lastUpdatedElement.textContent = date.toLocaleString('ja-JP');
    } else {
      lastUpdatedElement.textContent = '未取得';
    }

    // カード情報
    document.getElementById('card-count').textContent = this.cardData.length;
    this.renderCardList('card-list', this.cardData);
  }

  renderCardList(containerId, data) {
    const container = document.getElementById(containerId);

    if (data.length === 0) {
      container.innerHTML =
        '<div class="empty-state">利用明細がありません</div>';
      return;
    }

    container.innerHTML = data
      .map(
        transaction => `
      <div class="data-item transaction-item">
        <div class="transaction-info">
          <div class="transaction-title">${this.escapeHtml(transaction.title || '不明')}</div>
          <div class="transaction-amount">${this.escapeHtml(transaction.amount || '不明')}</div>
        </div>
        <div class="transaction-details">
          <span class="transaction-date">${this.escapeHtml(transaction.date || '不明')}</span>
        </div>
      </div>
    `
      )
      .join('');
  }

  async extractCardData() {
    // 現在のタブがMercariかチェック
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab.url.includes('jp.mercari.com')) {
      alert('Mercariのページで実行してください');
      return;
    }

    // コンテンツスクリプトにカード情報抽出を指示
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'extract_cards' });

      // 少し待ってからデータを再読み込み
      setTimeout(async () => {
        await this.loadData();
        this.updateUI();
      }, 1000);
    } catch (error) {
      console.error('カード情報抽出エラー:', error);
      alert(
        'カード情報の取得に失敗しました。ページを再読み込みしてから再試行してください。'
      );
    }
  }

  async inspectPage() {
    // 現在のタブがMercariかチェック
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab.url.includes('jp.mercari.com')) {
      alert('Mercariのページで実行してください');
      return;
    }

    // コンテンツスクリプトにページ検査を指示
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'inspect_page' });
    } catch (error) {
      console.error('ページ検査エラー:', error);
      alert('ページ検査に失敗しました。');
    }
  }

  exportToCSV() {
    const data = this.cardData;

    if (data.length === 0) {
      alert('エクスポートする利用明細がありません');
      return;
    }

    // freee対応フォーマット: ヘッダなし、日付はyyyy-MM-dd、金額は数値のみ
    const csvContent = data
      .map(transaction => {
        // 日付をyyyy-MM-dd形式に変換（時間部分を削除）
        let formattedDate = transaction.date || '不明';
        if (formattedDate !== '不明') {
          // "2025/06/08 07:43" → "2025-06-08"
          const dateMatch = formattedDate.match(/(\d{4})\/(\d{2})\/(\d{2})/);
          if (dateMatch) {
            formattedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
          }
        }

        // 金額から¥マークとカンマを削除して数値のみにする
        let formattedAmount = transaction.amount || '不明';
        if (formattedAmount !== '不明') {
          // "¥3,850" → "3850"
          formattedAmount = formattedAmount.replace(/[¥,円]/g, '');
        }

        return [
          `"${(transaction.title || '不明').replace(/"/g, '""')}"`,
          `"${formattedDate}"`,
          `"${formattedAmount}"`
        ].join(',');
      })
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `mercacolle_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  clearData() {
    if (!confirm('すべての利用明細を削除してもよろしいですか？')) {
      return;
    }

    chrome.storage.local.clear(() => {
      this.cardData = [];
      this.lastUpdated = null;
      this.updateUI();
      alert('利用明細を削除しました');
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// ポップアップ初期化
document.addEventListener('DOMContentLoaded', () => {
  new MercaCollePopup();
});
