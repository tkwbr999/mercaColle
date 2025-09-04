// Mercari明細取得用コンテンツスクリプト

class MercariDataExtractor {
  constructor() {
    this.init();
    this.setupMessageListener();
  }

  init() {
    this.observePageChanges();
  }

  // ポップアップからのメッセージを受信
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'extract_cards') {
        this.extractCardData();
        sendResponse({ success: true });
      } else if (request.action === 'inspect_page') {
        const result = this.inspectPageStructure(request.silent);
        sendResponse({ success: true, hasIssues: result.hasIssues });
      } else if (request.action === 'inspectPageStructure') {
        const result = this.inspectPageStructure(request.silent);
        sendResponse({ success: true, hasIssues: result.hasIssues });
      }
      return true;
    });
  }

  // ページの変更を監視
  observePageChanges() {
    const observer = new MutationObserver(() => {
      // ページ構造の変更を監視（現在は特別な処理は行わない）
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // カード情報データを抽出
  extractCardData() {
    const currentUrl = window.location.href;

    // スマートペイメントページ（easypay）かどうか判定
    if (currentUrl.includes('/mypage/merpay/smartpayment/easypay')) {
      this.extractPaymentTransactions();
    } else {
      const errorMessage = `対応していないページです。\n現在のURL: ${currentUrl}\n対応ページ: https://jp.mercari.com/mypage/merpay/smartpayment/easypay/select`;
      console.error('非対応ページでの実行:', errorMessage);
      this.sendNotificationToPopup('対応していないページです。スマートペイの明細ページで実行してください。', 'error');
    }
  }

  // 支払い取引明細の抽出
  extractPaymentTransactions() {
    // 支払い取引リストを表示する要素のセレクタパターンを試行
    const possibleSelectors = [
      '[data-testid="transaction-list"] > *',
      '[data-testid="payment-item"]',
      '.transaction-item',
      '.payment-item',
      '.transaction-list > *',
      '.payment-list > *',
      '.history-item',
      '.statement-item',
      '.merpay-transaction',
      '[class*="transaction"]',
      '[class*="payment"]',
      '[class*="history"]',
      '[class*="statement"]',
      'li', // 単純なリスト項目
      'div[role="listitem"]' // ARIA属性
    ];

    let transactionElements = [];

    for (const selector of possibleSelectors) {
      transactionElements = document.querySelectorAll(selector);
      // 複数の取引要素があるかチェック（チェックボックスがある行を探す）
      const elementsWithCheckbox = Array.from(transactionElements).filter(
        el => {
          return (
            el.querySelector('input[type="checkbox"]') ||
            el.textContent.match(/\d{4}\/\d{2}\/\d{2}/) || // 日付形式
            el.textContent.match(/¥\d+/)
          ); // 金額形式
        }
      );

      if (elementsWithCheckbox.length > 0) {
        transactionElements = elementsWithCheckbox;
        break;
      }
    }

    if (transactionElements.length === 0) {
      const pageStructure = this.debugGetPageStructure();
      const errorMessage = `利用明細要素が見つかりません。\n\nページ情報:\n- URL: ${window.location.href}\n- 検証した要素数: ${pageStructure.totalElements}\n- 利用可能なクラス: ${pageStructure.classes.slice(0, 10).join(', ')}\n\n対処方法:\n1. ページが完全に読み込まれるまでお待ちください\n2. ページをスクロールして全ての明細を表示してください\n3. Mercariのページ構造が変更された可能性があります`;
      console.error('明細要素検索失敗:', errorMessage, { pageStructure });
      this.sendNotificationToPopup('利用明細要素が見つかりません。ページを完全に読み込んでから再試行してください。', 'error');
      return;
    }

    const transactionData = [];
    transactionElements.forEach(transactionElement => {
      const transactionInfo =
        this.extractTransactionItemData(transactionElement);
      if (transactionInfo) {
        transactionData.push(transactionInfo);
      }
    });

    if (transactionData.length > 0) {
      this.sendDataToPopup('card', transactionData);
      this.sendNotificationToPopup(`成功: ${transactionData.length}件の利用明細を取得しました。`, 'success');
    } else {
      const errorMessage = `利用明細の抽出に失敗しました。\n\n詳細:\n- 検出した要素数: ${transactionElements.length}\n- 抽出できたデータ数: 0\n- URL: ${window.location.href}\n\n原因:\n- Mercariのページ構造が変更された可能性があります\n- 明細データの形式が想定と異なる可能性があります\n\n対処方法:\n- ページ構造検査ボタンでデバッグ情報を確認してください`;
      console.error('明細抽出失敗:', errorMessage, {
        foundElements: transactionElements.length,
        extractedData: transactionData.length,
        url: window.location.href
      });
      this.sendNotificationToPopup('利用明細の抽出に失敗しました。ページ構造検査で詳細を確認してください。', 'error');
    }
  }

  // 個別取引明細データの抽出
  extractTransactionItemData(element) {
    try {
      const fullText = element.textContent || '';

      // 日付の抽出 - より幅広いパターンでチェック
      let date = '';
      // YYYY/MM/DD HH:MM 形式
      let dateMatch = fullText.match(
        /(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/
      );
      if (dateMatch) {
        date = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]} ${dateMatch[4]}:${dateMatch[5]}`;
      } else {
        // YYYY/MM/DD 形式のみ
        dateMatch = fullText.match(/(\d{4})\/(\d{2})\/(\d{2})/);
        if (dateMatch) {
          date = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
        }
      }

      // 金額の抽出 - より幅広いパターンでチェック
      let amount = '';
      // ¥記号付きの金額
      let amountMatch = fullText.match(/¥([\d,]+)/);
      if (amountMatch) {
        amount = `¥${amountMatch[1]}`;
      } else {
        // 円記号付きの金額
        amountMatch = fullText.match(/([\d,]+)円/);
        if (amountMatch) {
          amount = `${amountMatch[1]}円`;
        } else {
          // 数字のみの金額（3桁以上）
          amountMatch = fullText.match(/(\d{3,}([,]\d{3})*)/);
          if (amountMatch && parseInt(amountMatch[1].replace(/,/g, '')) > 100) {
            amount = `¥${amountMatch[1]}`;
          }
        }
      }

      // 件名の抽出（日付と金額を除いた部分から推測）
      let title = '';

      // 方法 1: テキストを行単位で分割して解析
      const lines = fullText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

      for (const line of lines) {
        // 日付、金額、コントロール要素のパターンをスキップ
        if (line.match(/\d{4}\/\d{2}\/\d{2}/)) continue;
        if (line.match(/\d{2}:\d{2}/)) continue;
        if (line.match(/¥[\d,]+/)) continue;
        if (line.match(/[\d,]+円/)) continue;
        if (line.match(/^\d{3,}$/)) continue; // 数字のみの行
        if (line.includes('解除する')) continue;
        if (line.includes('すべてを')) continue;
        if (line.includes('選択')) continue;
        if (line.includes('チェック')) continue;
        if (line.length < 3) continue; // 短すぎるテキストをスキップ

        // 意味のあるテキストを件名として採用
        if (!line.match(/^[\s\n\t]*$/)) {
          title = line;
          break;
        }
      }

      // 方法 2: DOM構造から直接テキストノードを抽出
      if (!title) {
        const textNodes = [];
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        while ((node = walker.nextNode())) {
          const text = node.textContent.trim();
          if (
            text &&
            !text.match(/\d{4}\/\d{2}\/\d{2}/) &&
            !text.match(/\d{2}:\d{2}/) &&
            !text.match(/¥[\d,]+/) &&
            !text.match(/[\d,]+円/) &&
            !text.match(/^\d{3,}$/) &&
            text.length > 2 &&
            !text.includes('解除') &&
            !text.includes('選択')
          ) {
            textNodes.push(text);
          }
        }

        if (textNodes.length > 0) {
          title = textNodes[0];
        }
      }

      // 方法 3: 正規表現で抽出
      if (!title && fullText) {
        // 日付行より前の部分を件名とする
        const beforeDate = fullText.split(/\d{4}\/\d{2}\/\d{2}/)[0];
        if (beforeDate && beforeDate.trim()) {
          let cleanTitle = beforeDate
            .trim()
            .replace(/[\n\r\t]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/¥[\d,]+/g, '') // 金額を除去
            .replace(/[\d,]+円/g, '') // 円表記を除去
            .replace(/\d{2}:\d{2}/g, '') // 時刻を除去
            .trim();

          if (cleanTitle.length > 2) {
            title = cleanTitle;
          }
        }
      }

      // 方法 4: 子要素からの抽出
      if (!title) {
        // 子要素をスキャンして件名らしきテキストを探す
        const childElements = element.querySelectorAll('*');
        for (const child of childElements) {
          const childText = child.textContent?.trim() || '';
          if (
            childText &&
            childText.length > 3 &&
            childText.length < 50 && // 長すぎるテキストを除外
            !childText.match(/\d{4}\/\d{2}\/\d{2}/) &&
            !childText.match(/¥[\d,]+/) &&
            !childText.match(/[\d,]+円/) &&
            !childText.includes('解除') &&
            !childText.includes('選択')
          ) {
            title = childText;
            break;
          }
        }
      }

      // データが抽出できた場合のみ返す
      if (date && amount && title) {
        const result = {
          title: title.trim(),
          date: date,
          amount: amount,
          url: window.location.href,
          extractedAt: new Date().toISOString(),
          rawText: fullText.trim() // デバッグ用
        };
        return result;
      }

      // 部分的にでもデータがある場合は返す
      if (date || amount || (title && title.length > 2)) {
        const result = {
          title: title.trim() || '不明',
          date: date || '不明',
          amount: amount || '不明',
          url: window.location.href,
          extractedAt: new Date().toISOString(),
          rawText: fullText.trim() // デバッグ用
        };
        return result;
      }

      return null;
    } catch (error) {
      const errorMessage = `取引明細抽出エラー: ${error.message}\n\n詳細:\n- 要素: ${element ? element.tagName : 'null'}\n- エラータイプ: ${error.name}\n- スタック: ${error.stack}`;
      console.error('取引明細抽出エラー:', errorMessage, {
        element: element,
        error: error,
        url: window.location.href
      });
      return null;
    }
  }

  // ページ構造の詳細検査
  inspectPageStructure(silent = false) {
    console.log('=== ページ構造の詳細検査 ===');

    // 基本情報
    console.log('ページ情報:', {
      title: document.title,
      url: window.location.href,
      readyState: document.readyState
    });

    // 金額を含む要素の詳細分析
    const amountElements = Array.from(document.querySelectorAll('*')).filter(
      el => el.textContent && el.textContent.match(/¥[\d,]+/)
    );

    console.log(`金額を含む要素 (${amountElements.length}個):`);
    amountElements.slice(0, 10).forEach((el, idx) => {
      console.log(`  ${idx + 1}:`, {
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        textContent: el.textContent.trim().substring(0, 100),
        parentTagName: el.parentElement?.tagName,
        parentClassName: el.parentElement?.className
      });
    });

    // 日付を含む要素の詳細分析
    const dateElements = Array.from(document.querySelectorAll('*')).filter(
      el => el.textContent && el.textContent.match(/\d{4}\/\d{2}\/\d{2}/)
    );

    console.log(`日付を含む要素 (${dateElements.length}個):`);
    dateElements.slice(0, 10).forEach((el, idx) => {
      console.log(`  ${idx + 1}:`, {
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        textContent: el.textContent.trim().substring(0, 100),
        parentTagName: el.parentElement?.tagName,
        parentClassName: el.parentElement?.className
      });
    });

    // チェックボックスを含む要素
    const checkboxElements = document.querySelectorAll(
      'input[type="checkbox"]'
    );
    console.log(`チェックボックス要素 (${checkboxElements.length}個):`);
    Array.from(checkboxElements)
      .slice(0, 5)
      .forEach((checkbox, idx) => {
        const container = checkbox.closest('div, li, tr, section, article');
        console.log(`  ${idx + 1}:`, {
          checkboxName: checkbox.name,
          checkboxValue: checkbox.value,
          containerTagName: container?.tagName,
          containerClassName: container?.className,
          containerText: container?.textContent?.trim().substring(0, 150)
        });
      });

    // リスト構造の分析
    const lists = document.querySelectorAll('ul, ol');
    console.log(`リスト要素 (${lists.length}個):`);
    Array.from(lists)
      .slice(0, 5)
      .forEach((list, idx) => {
        const items = list.querySelectorAll('li');
        console.log(`  ${idx + 1}:`, {
          tagName: list.tagName,
          className: list.className,
          itemCount: items.length,
          firstItemText: items[0]?.textContent?.trim().substring(0, 100)
        });
      });

    // 問題の検出
    const hasIssues = this.detectPageIssues();

    if (!silent) {
      this.sendNotificationToPopup('ページ構造の詳細検査が完了しました。コンソールで結果を確認してください。', 'info');
    }

    return { hasIssues };
  }

  // ページの問題を検出
  detectPageIssues() {
    const issues = [];

    // 金額要素が少ない
    const amountElements = Array.from(document.querySelectorAll('*')).filter(
      el => el.textContent && el.textContent.match(/¥[\d,]+/)
    );
    if (amountElements.length < 3) {
      issues.push('金額要素が少ない');
    }

    // 日付要素が少ない
    const dateElements = Array.from(document.querySelectorAll('*')).filter(
      el => el.textContent && el.textContent.match(/\d{4}\/\d{2}\/\d{2}/)
    );
    if (dateElements.length < 3) {
      issues.push('日付要素が少ない');
    }

    // チェックボックスが少ない
    const checkboxElements = document.querySelectorAll('input[type="checkbox"]');
    if (checkboxElements.length < 2) {
      issues.push('チェックボックス要素が少ない');
    }

    // 問題がある場合はログに出力
    if (issues.length > 0) {
      console.warn('ページ構造の問題を検出:', issues);
    }

    return issues.length > 0;
  }

  // デバッグ用: ページ構造を取得
  debugGetPageStructure() {
    const structure = {
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
        ).slice(0, 20),
        dataTestIds: Array.from(document.querySelectorAll('[data-testid]'))
          .map(el => el.getAttribute('data-testid'))
          .slice(0, 20),
        ids: Array.from(document.querySelectorAll('[id]'))
          .map(el => el.id)
          .slice(0, 20)
      }
    };

    return structure;
  }

  // ポップアップにデータを送信
  sendDataToPopup(type, data) {
    const storageData = {
      [`mercari_${type}_data`]: data,
      last_updated: new Date().toISOString()
    };

    chrome.storage.local.set(storageData, () => {
      // データ保存完了（ログ出力なし）
    });
  }

  // ポップアップに通知を送信
  sendNotificationToPopup(message, type = 'info') {
    // ストレージに通知データを保存
    chrome.storage.local.set({
      notification: {
        message: message,
        type: type,
        timestamp: new Date().toISOString()
      }
    });
  }
}

// 拡張機能の初期化
new MercariDataExtractor();
