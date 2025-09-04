export default [
  {
    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
      globals: {
        browser: true,
        es2021: true,
        chrome: 'readonly',
        DevConfig: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        Blob: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        NodeFilter: 'readonly',
        MutationObserver: 'readonly'
      }
    },
    rules: {
      // 未使用変数の検出
      'no-unused-vars': ['error', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: false
      }],
      
      // 未使用の式
      'no-unused-expressions': 'error',
      
      // 到達不可能なコード
      'no-unreachable': 'error',
      
      // 重複したプロパティ
      'no-dupe-keys': 'error',
      
      // 重複した引数
      'no-dupe-args': 'error',
      
      // セミコロン
      'semi': ['error', 'always'],
      
      // クォート
      'quotes': ['error', 'single'],
      
      // インデント
      'indent': ['error', 2],
      
      // 末尾のカンマ
      'comma-dangle': ['error', 'never'],
      
      // コンソールログの許可（開発中）
      'no-console': 'off',
      
      // アラートの許可（Chrome拡張機能用）
      'no-alert': 'off'
    }
  }
];