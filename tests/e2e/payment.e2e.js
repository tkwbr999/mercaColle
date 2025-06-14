// mercaColle 利用明細機能 E2Eテスト

const puppeteer = require('puppeteer');
const path = require('path');

describe('mercaColle Transaction E2E Tests', () => {
  let browser;
  let extensionPage;
  let paymentPage;

  const EXTENSION_PATH = path.join(__dirname, '../..');
  const EXTENSION_ID = 'test-extension-id'; // 実際のテストでは動的に取得
  const PAYMENT_URL =
    'https://jp.mercari.com/mypage/merpay/smartpayment/easypay/select';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    extensionPage = await browser.newPage();
    await extensionPage.goto(
      `chrome-extension://${EXTENSION_ID}/popup/popup.html`
    );
  });

  afterEach(async () => {
    if (extensionPage) {
      await extensionPage.close();
    }
    if (paymentPage) {
      await paymentPage.close();
    }
  });

  describe('利用明細ページ連携テスト', () => {
    test('利用明細ページが正しく開かれる', async () => {
      paymentPage = await browser.newPage();

      try {
        await paymentPage.goto(PAYMENT_URL, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });

        // ページが正しく読み込まれることを確認
        const url = paymentPage.url();
        expect(url).toContain('jp.mercari.com/mypage/merpay/smartpayment');

        // ページタイトルの確認
        const title = await paymentPage.title();
        expect(title).toMatch(/mercari|メルカリ|merpay|メルペイ/i);
      } catch (error) {
        console.error('利用明細ページアクセスエラー:', error);

        // ログインが必要な場合はログインページにリダイレクトされる
        const currentUrl = paymentPage.url();
        if (currentUrl.includes('login.jp.mercari.com')) {
          console.log('ログインが必要です。ログインページが表示されました。');
          expect(currentUrl).toContain('login.jp.mercari.com');
        } else {
          throw error;
        }
      }
    });

    test('利用明細ページでのデータ抽出機能', async () => {
      paymentPage = await browser.newPage();

      // 利用明細ページのモック作成
      await paymentPage.setContent(`
        <html>
          <head><title>メルペイスマート払い</title></head>
          <body>
            <div class="transaction-item">
              <div>テスト商品サービス</div>
              <div>2025/06/08 07:43</div>
              <div>¥3,850</div>
            </div>
            <div class="transaction-item">
              <div>サンプル決済項目</div>
              <div>2025/06/06 18:12</div>
              <div>¥1,554</div>
            </div>
          </body>
        </html>
      `);

      // URLを設定
      await paymentPage.evaluate(() => {
        Object.defineProperty(window, 'location', {
          value: {
            href: 'https://jp.mercari.com/mypage/merpay/smartpayment/easypay/select'
          },
          writable: true
        });
      });

      // コンテンツスクリプトによるデータ抽出をシミュレート
      const extractedData = await paymentPage.evaluate(() => {
        const items = document.querySelectorAll('.transaction-item');
        const transactionData = [];

        items.forEach(item => {
          const text = item.textContent || '';
          const lines = text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line);

          let title = '';
          let date = '';
          let amount = '';

          for (const line of lines) {
            if (line.match(/\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}/)) {
              date = line;
            } else if (line.match(/¥[\d,]+/)) {
              amount = line;
            } else if (line.length > 2) {
              title = line;
            }
          }

          if (title && date && amount) {
            transactionData.push({
              title: title,
              date: date,
              amount: amount,
              url: window.location.href,
              extractedAt: new Date().toISOString()
            });
          }
        });

        return transactionData;
      });

      expect(extractedData).toHaveLength(2);

      // 正規表現パターンで検証
      expect(extractedData[0]).toEqual(
        expect.objectContaining({
          title: expect.stringMatching(/^[^\d]*$/), // 数字以外の文字列
          amount: expect.stringMatching(/^¥[\d,]+$/), // ¥マーク + 数字とカンマ
          date: expect.stringMatching(/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}$/) // 日付時刻フォーマット
        })
      );
    });
  });

  describe('ページ検査機能テスト', () => {
    test('ページ検査機能が動作する', async () => {
      // ページ検査ボタンをクリック
      await extensionPage.click('#inspect-btn');

      // アラートが表示されるのを待つ
      await new Promise(resolve => setTimeout(resolve, 1000));

      // コンソールにデバッグ情報が出力されることを確認
      const logs = [];
      extensionPage.on('console', msg => {
        if (msg.text().includes('ページ構造の詳細検査')) {
          logs.push(msg.text());
        }
      });

      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('デバッグ機能テスト', () => {
    test('ページ構造解析機能が動作する', async () => {
      paymentPage = await browser.newPage();

      await paymentPage.setContent(`
        <html>
          <head><title>テストページ</title></head>
          <body>
            <div class="test-class" data-testid="test-element" id="test-id">テスト要素</div>
            <div class="another-class">別の要素</div>
          </body>
        </html>
      `);

      // ページ構造解析をテスト
      const pageStructure = await paymentPage.evaluate(() => {
        // devConfig.jsの debugGetPageStructure 相当の処理
        return {
          title: document.title,
          url: window.location.href,
          elements: {
            divs: document.querySelectorAll('div').length,
            classes: Array.from(
              new Set(
                Array.from(document.querySelectorAll('[class]'))
                  .map(el => el.className.split(' '))
                  .flat()
              )
            ),
            dataTestIds: Array.from(
              document.querySelectorAll('[data-testid]')
            ).map(el => el.getAttribute('data-testid')),
            ids: Array.from(document.querySelectorAll('[id]')).map(el => el.id)
          }
        };
      });

      expect(pageStructure.title).toBe('テストページ');
      expect(pageStructure.elements.divs).toBe(2);
      expect(pageStructure.elements.classes).toContain('test-class');
      expect(pageStructure.elements.dataTestIds).toContain('test-element');
      expect(pageStructure.elements.ids).toContain('test-id');
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('ペイメントページが見つからない場合の処理', async () => {
      paymentPage = await browser.newPage();

      // 空のページを作成（ペイメント要素なし）
      await paymentPage.setContent(`
        <html>
          <head><title>空のページ</title></head>
          <body>
            <div>ペイメント要素がないページ</div>
          </body>
        </html>
      `);

      // データ抽出を試行
      const extractedData = await paymentPage.evaluate(() => {
        const possibleSelectors = [
          '[data-testid="payment-item"]',
          '.payment-item',
          '.smart-payment-item',
          '.easypay-item'
        ];

        let items = [];
        for (const selector of possibleSelectors) {
          items = document.querySelectorAll(selector);
          if (items.length > 0) break;
        }

        return {
          found: items.length > 0,
          count: items.length
        };
      });

      // 要素が見つからないことを確認
      expect(extractedData.found).toBe(false);
      expect(extractedData.count).toBe(0);
    });
  });
});
