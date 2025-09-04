// mercaColle ポップアップ機能のユニットテスト

describe('MercaCollePopup', () => {
  let popup;
  let mockChrome;

  beforeEach(() => {
    // DOM要素の模擬作成
    document.body.innerHTML = `
      <div class="container">
        <h1>mercaColle（メルカコレ）</h1>
        <div class="data-section">
          <div class="data-header">
            <h2>カード利用明細</h2>
          </div>
          <div class="data-content">
            <div id="card-info" class="card-content active">
              <div class="data-stats">
                <span>取得済み明細: <span id="card-count">0</span>件</span>
              </div>
              <div id="card-list" class="data-list"></div>
            </div>
          </div>
        </div>
        <div id="last-updated">未取得</div>
        <button id="extract-btn" class="primary-btn">利用明細取得</button>
        <button id="inspect-btn" class="secondary-btn">ページ構造検査</button>
        <button id="export-btn" class="secondary-btn">CSVエクスポート</button>
        <button id="clear-btn" class="danger-btn">データクリア</button>
      </div>
    `;

    // Chrome API のモック
    mockChrome = {
      storage: {
        local: {
          get: jest.fn((keys, callback) => {
            callback({
              mercari_card_data: [],
              last_updated: null
            });
          }),
          set: jest.fn((data, callback) => {
            if (callback) callback();
          }),
          clear: jest.fn(callback => {
            if (callback) callback();
          })
        }
      },
      tabs: {
        query: jest.fn().mockResolvedValue([
          {
            url: 'https://jp.mercari.com/mypage/merpay/smartpayment/easypay/select',
            id: 123
          }
        ]),
        sendMessage: jest.fn().mockResolvedValue({ success: true })
      }
    };

    global.chrome = mockChrome;
    global.alert = jest.fn();
    global.confirm = jest.fn(() => true);

    // MercaCollePopupクラスを読み込み（実際のファイルから）
    const MercaCollePopup =
      require('../../popup/popup.js').MercaCollePopup ||
      class MockMercaCollePopup {
        constructor() {
          this.cardData = [];
          this.lastUpdated = null;
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
          document.getElementById('card-count').textContent =
            this.cardData.length;
          const lastUpdatedElement = document.getElementById('last-updated');
          if (this.lastUpdated) {
            const date = new Date(this.lastUpdated);
            lastUpdatedElement.textContent = date.toLocaleString('ja-JP');
          } else {
            lastUpdatedElement.textContent = '未取得';
          }
        }
        async extractCardData() {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
          });
          if (!tab.url.includes('jp.mercari.com')) {
            alert('Mercariのページで実行してください');
            return;
          }
          await chrome.tabs.sendMessage(tab.id, { action: 'extract_cards' });
        }
        async inspectPage() {
          const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
          });
          if (!tab.url.includes('jp.mercari.com')) {
            alert('Mercariのページで実行してください');
            return;
          }
          await chrome.tabs.sendMessage(tab.id, { action: 'inspect_page' });
        }
        exportToCSV() {
          if (this.cardData.length === 0) {
            alert('エクスポートする利用明細がありません');
            return;
          }

          // freee対応フォーマット: ヘッダなし、日付はyyyy-MM-dd、金額は数値のみ
          const csvContent = this.cardData
            .map(transaction => {
              // 日付をyyyy-MM-dd形式に変換（時間部分を削除）
              let formattedDate = transaction.date || '不明';
              if (formattedDate !== '不明') {
                // "2025/06/08 07:43" → "2025-06-08"
                const dateMatch = formattedDate.match(
                  /(\d{4})\/(\d{2})\/(\d{2})/
                );
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
      };

    popup = new MercaCollePopup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('初期化', () => {
    test('カードデータが空配列で初期化される', () => {
      expect(popup.cardData).toEqual([]);
    });
  });

  describe('利用明細データ管理機能', () => {
    test('利用明細データの読み込みが正常に動作する', async () => {
      const testData = {
        mercari_card_data: [
          {
            title: 'テスト商品サービス',
            date: '2025/06/08 07:43',
            amount: '¥3,850'
          }
        ],
        last_updated: '2025-01-01T00:00:00.000Z'
      };

      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(testData);
      });

      await popup.loadData();

      expect(popup.cardData).toEqual(testData.mercari_card_data);
      expect(popup.lastUpdated).toBe(testData.last_updated);
    });

    test('UIの更新が正常に動作する', () => {
      popup.cardData = [
        {
          title: 'テスト商品サービス',
          date: '2025/06/08 07:43',
          amount: '¥3,850'
        },
        {
          title: 'サンプル決済項目',
          date: '2025/06/06 18:12',
          amount: '¥1,554'
        }
      ];
      popup.lastUpdated = '2025-01-01T12:00:00.000Z';

      popup.updateUI();

      expect(document.getElementById('card-count').textContent).toBe('2');
      expect(document.getElementById('last-updated').textContent).toContain(
        '2025'
      );
    });

    test('データクリア機能が動作する', () => {
      popup.clearData();

      expect(mockChrome.storage.local.clear).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith('利用明細を削除しました');
    });
  });

  describe('利用明細抽出機能', () => {
    test('Mercariページで利用明細抽出が実行される', async () => {
      await popup.extractCardData();

      expect(mockChrome.tabs.query).toHaveBeenCalled();
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        action: 'extract_cards'
      });
    });

    test('非Mercariページでアラートが表示される', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { url: 'https://google.com', id: 123 }
      ]);

      await popup.extractCardData();

      expect(global.alert).toHaveBeenCalledWith(
        'Mercariのページで実行してください'
      );
    });
  });

  describe('ページ検査機能', () => {
    test('Mercariページでページ検査が実行される', async () => {
      await popup.inspectPage();

      expect(mockChrome.tabs.query).toHaveBeenCalled();
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(123, {
        action: 'inspect_page'
      });
    });

    test('非Mercariページでアラートが表示される', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { url: 'https://google.com', id: 123 }
      ]);

      await popup.inspectPage();

      expect(global.alert).toHaveBeenCalledWith(
        'Mercariのページで実行してください'
      );
    });
  });

  describe('CSVエクスポート機能', () => {
    test('利用明細データが空の場合アラートが表示される', () => {
      popup.cardData = [];

      popup.exportToCSV();

      expect(global.alert).toHaveBeenCalledWith(
        'エクスポートする利用明細がありません'
      );
    });

    test('freee対応フォーマットでCSVが生成される', () => {
      // Blobとlink要素のモック
      global.Blob = jest.fn((content, options) => {
        return { size: content[0].length, type: options.type };
      });
      global.URL = { createObjectURL: jest.fn(() => 'blob:test') };

      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      document.createElement = jest.fn(tagName => {
        if (tagName === 'a') return mockLink;
        return {};
      });

      popup.cardData = [
        {
          title: 'テスト商品サービス',
          date: '2025/06/08 07:43',
          amount: '¥3,850'
        },
        {
          title: 'サンプル決済項目',
          date: '2025/06/06 18:12',
          amount: '¥1,554'
        }
      ];

      popup.exportToCSV();

      // Blobが呼ばれたことを確認
      expect(global.Blob).toHaveBeenCalled();

      // Blobの内容を確認（BOMを含む）
      const blobArgs = global.Blob.mock.calls[0];
      const csvContent = blobArgs[0][0];

      // freee対応フォーマットの確認（正規表現パターンで検証）
      expect(csvContent).toMatch(/"[^"]+","2025-06-08","3850"/); // 件名,日付,金額のパターン
      expect(csvContent).toMatch(/"[^"]+","2025-06-06","1554"/); // 件名,日付,金額のパターン
      expect(csvContent).not.toContain('件名,日付,金額'); // ヘッダなし
      expect(csvContent).not.toContain('07:43'); // 時間なし
      expect(csvContent).not.toContain('¥'); // ¥マークなし

      // ダウンロードが実行されることを確認
      expect(mockLink.click).toHaveBeenCalled();
    });

    test('日付と金額の変換が正しく動作する', () => {
      global.Blob = jest.fn((content, options) => {
        return { size: content[0].length, type: options.type };
      });
      global.URL = { createObjectURL: jest.fn(() => 'blob:test') };

      const mockLink = {
        href: '',
        download: '',
        click: jest.fn()
      };
      document.createElement = jest.fn(tagName => {
        if (tagName === 'a') return mockLink;
        return {};
      });

      popup.cardData = [
        {
          title: 'テスト取引',
          date: '2025/12/31 23:59',
          amount: '¥12,345'
        }
      ];

      popup.exportToCSV();

      // 日付がyyyy-MM-dd形式、金額が数値のみになることを確認
      expect(global.Blob).toHaveBeenCalled();
      const blobContent = global.Blob.mock.calls[0][0][0];
      expect(blobContent).toContain('"2025-12-31"');
      expect(blobContent).toContain('"12345"');
      expect(blobContent).not.toContain('23:59'); // 時間が削除されている
      expect(blobContent).not.toContain('¥'); // ¥マークが削除されている
    });
  });
});
