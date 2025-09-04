# リリースプロセス

## 概要

このプロジェクトでは、GitHub Actionsを使用して自動化されたリリースプロセスを実装しています。

## リリースワークフロー

### 1. CIワークフロー (`.github/workflows/ci.yml`)

**トリガー**: プルリクエスト、main/developブランチへのプッシュ

**実行内容**:
- 依存関係のインストール
- リントチェック (ESLint)
- フォーマットチェック (Prettier)
- ユニットテスト実行
- E2Eテスト実行
- ビルド実行
- テストカバレッジのアップロード

### 2. リリースワークフロー (`.github/workflows/release.yml`)

**トリガー**: セマンティックバージョンタグのプッシュ (例: `v1.0.0`)

**実行内容**:
- CIワークフローと同じ品質チェック
- エラーが発生した場合、リリースは作成されません
- 成功した場合のみ:
  - 配布用ZIPファイルの作成
  - GitHubリリースの自動作成
  - リリースノートの自動生成

## リリース手順

### 1. 準備
```bash
# 最新のmainブランチを取得
git checkout main
git pull origin main

# 開発ブランチで作業
git checkout -b feature/new-feature
# ... 開発作業 ...
```

### 2. プルリクエスト作成
```bash
# プッシュしてプルリクエスト作成
git push origin feature/new-feature
```

### 3. CIチェック
- プルリクエストでCIが自動実行されます
- すべてのチェックが通るまでマージしません

### 4. リリース
```bash
# mainブランチにマージ後、タグを作成
git checkout main
git pull origin main

# セマンティックバージョンでタグ作成
git tag v1.0.0
git push origin v1.0.0
```

### 5. 自動リリース
- タグがプッシュされると自動的にリリースワークフローが実行されます
- すべてのテストが通ると、GitHubリリースが作成されます
- 配布用ZIPファイルが自動的にアップロードされます

## セマンティックバージョニング

このプロジェクトでは [Semantic Versioning](https://semver.org/) に従います:

- **MAJOR**: 互換性のない変更 (例: `v1.0.0` → `v2.0.0`)
- **MINOR**: 後方互換性のある新機能追加 (例: `v1.0.0` → `v1.1.0`)
- **PATCH**: 後方互換性のあるバグ修正 (例: `v1.0.0` → `v1.0.1`)

## 配布用ZIPファイル

リリース時に作成されるZIPファイルには以下が含まれます:

- `manifest.json` - 拡張機能の設定
- `popup/` - ポップアップUIファイル
- `src/` - コンテンツスクリプト
- `assets/` - アイコンファイル

**除外されるファイル**:
- `node_modules/` - 依存関係
- `tests/` - テストファイル
- `coverage/` - テストカバレッジ
- `.git/` - Git関連ファイル
- `*.log` - ログファイル
- `package-lock.json` - 依存関係ロックファイル
- `.DS_Store` - macOSシステムファイル
- `dist/`, `build/` - ビルド出力ディレクトリ
- `.env*` - 環境変数ファイル
- `*.tmp`, `*.temp` - 一時ファイル

## トラブルシューティング

### リリースが作成されない場合

1. **CIチェックが失敗している**
   - プルリクエストでCIが通っているか確認
   - ローカルで `npm run test` を実行してテストが通るか確認

2. **タグの形式が正しくない**
   - タグは `v` で始まる必要があります (例: `v1.0.0`)
   - セマンティックバージョンの形式に従ってください

3. **権限の問題**
   - GitHubリポジトリの設定でActionsが有効になっているか確認
   - `GITHUB_TOKEN` の権限が適切に設定されているか確認

### 手動でのリリース作成

自動リリースが失敗した場合、手動でリリースを作成できます:

1. GitHubのリリースページに移動
2. "Draft a new release" をクリック
3. タグを選択
4. リリースノートを記入
5. 手動でZIPファイルをアップロード

## 設定ファイル

### package.json のスクリプト

```json
{
  "scripts": {
    "build": "npm run lint && npm run format",
    "test": "jest",
    "lint": "eslint popup/ src/ tests/",
    "format:check": "prettier --check popup/ src/ tests/"
  }
}
```

これらのスクリプトがリリースワークフローで使用されます。
