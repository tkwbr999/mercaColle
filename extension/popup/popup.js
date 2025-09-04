// メルカコレ ポップアップスクリプト

class MercaCollePopup {
  constructor() {
    this.cardData = [];
    this.toastTimeout = null;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadData();
    this.updateUI();
    // プラグイン開封時に自動でページ構造検査を実行
    await this.autoInspectPage();
  }

  setupEventListeners() {
    // 利用方法トグルボタン
    document.getElementById('usage-toggle').addEventListener('click', () => {
      this.toggleUsage();
    });

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

    // コンテンツスクリプトからの通知を受信
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'showNotification') {
        this.showToast(request.message, request.type, 5000);
      }
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

  toggleUsage() {
    const toggle = document.getElementById('usage-toggle');
    const content = document.getElementById('usage-content');

    toggle.classList.toggle('active');
    content.classList.toggle('active');
  }

  showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    toast.innerHTML = `
      <div class="toast-content">${message}</div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    // 自動で消える
    if (duration > 0) {
      setTimeout(() => {
        this.hideToast(toast);
      }, duration);
    }
  }

  hideToast(toast) {
    toast.classList.add('hiding');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }

  async autoInspectPage() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      if (!tab.url.includes('jp.mercari.com')) {
        return; // Mercariページでない場合は何もしない
      }

      // 静かにページ構造を検査
      const result = await chrome.tabs.sendMessage(tab.id, {
        action: 'inspectPageStructure',
        silent: true // 通知なしフラグ
      });

      // 問題がある場合のみ通知
      if (result && result.hasIssues) {
        this.showToast(
          'ページ構造に問題があります。「ページ構造検査」で詳細を確認してください。',
          'warning',
          4000
        );
      }
    } catch (error) {
      // エラーが発生した場合は静かに処理（通知なし）
      console.log('Auto inspection failed:', error);
    }
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
      this.showToast('Mercariのページで実行してください', 'error', 3000);
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
      this.showToast(
        'カード情報の取得に失敗しました。ページを再読み込みしてから再試行してください。',
        'error',
        5000
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
      this.showToast('Mercariのページで実行してください', 'error', 3000);
      return;
    }

    // コンテンツスクリプトにページ検査を指示
    try {
      const result = await chrome.tabs.sendMessage(tab.id, {
        action: 'inspect_page',
        silent: false // 手動実行時は通知あり
      });

      if (result && result.hasIssues) {
        this.showToast(
          'ページ構造に問題があります。詳細はコンソールを確認してください。',
          'warning',
          4000
        );
      } else {
        this.showToast('ページ構造検査が完了しました。', 'success', 3000);
      }
    } catch (error) {
      console.error('ページ検査エラー:', error);
      this.showToast('ページ検査に失敗しました。', 'error', 3000);
    }
  }

  exportToCSV() {
    const data = this.cardData;

    if (data.length === 0) {
      this.showToast('エクスポートする利用明細がありません', 'warning', 3000);
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
      this.showToast('利用明細を削除しました', 'success', 3000);
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
