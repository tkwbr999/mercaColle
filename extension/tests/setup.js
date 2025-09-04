// Jest テストセットアップファイル

// JSDOMの警告を抑制
const originalConsoleError = console.error;
console.error = (...args) => {
  // JSDOMの"Not implemented: navigation"警告を抑制
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    args[0].includes('Not implemented: navigation')
  ) {
    return;
  }
  // エラーオブジェクトの場合もチェック
  if (
    args[0] &&
    args[0].message &&
    args[0].message.includes('Not implemented: navigation')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Chrome API のグローバルモック
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        callback({});
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
    query: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({}),
    sendMessage: jest.fn().mockResolvedValue({})
  },
  runtime: {
    onMessage: {
      addListener: jest.fn()
    }
  }
};

// DOM API のモック
global.document.createElement = jest.fn().mockImplementation(tagName => {
  const element = {
    tagName: tagName.toUpperCase(),
    textContent: '',
    innerHTML: '',
    value: '',
    type: 'text',
    checked: false,
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn().mockReturnValue(false),
      toggle: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn(),
    focus: jest.fn(),
    click: jest.fn(),
    dispatchEvent: jest.fn()
  };

  // 特定のタグ用の追加プロパティ
  if (tagName === 'a') {
    element.href = '';
    element.download = '';
  }

  return element;
});

// Blob のモック
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content ? content.join('').length : 0,
  type: options?.type || ''
}));

// URL のモック
global.URL = {
  createObjectURL: jest.fn().mockReturnValue('mock-blob-url'),
  revokeObjectURL: jest.fn()
};

// btoa のモック（Base64エンコード）
global.btoa = jest.fn().mockImplementation(str => {
  return Buffer.from(str).toString('base64');
});

// atob のモック（Base64デコード）
global.atob = jest.fn().mockImplementation(str => {
  return Buffer.from(str, 'base64').toString();
});

// window.alert のモック
global.alert = jest.fn();

// window.confirm のモック
global.confirm = jest.fn().mockReturnValue(true);

// console メソッドのスパイ設定
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// テスト前の共通セットアップ
beforeEach(() => {
  // DOM をリセット
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // モックをリセット
  jest.clearAllMocks();
});

// テスト後のクリーンアップ
afterEach(() => {
  // タイマーをクリア
  jest.clearAllTimers();
});
