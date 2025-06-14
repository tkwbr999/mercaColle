# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.0] - 2025-06-14

### 🎉 Initial Release

#### Added
- **基本機能**
  - Mercariスマート払い利用明細の自動抽出
  - 件名・日付・金額の取得
  - CSVエクスポート機能（freee対応フォーマット）
  - ローカルストレージでのデータ保存・管理

- **デバッグ機能**
  - ページ構造検査機能
  - 詳細なエラーメッセージとログ出力
  - 25種類以上のセレクターパターンによる堅牢な要素検出

- **ユーザーインターフェース**
  - シンプルで使いやすいポップアップUI
  - 取得済み明細の件数表示
  - 最終更新時刻の表示
  - データクリア機能

- **開発環境**
  - ESLint + Prettier によるコード品質管理
  - Jest によるユニットテスト・E2Eテスト
  - 包括的なエラーハンドリング

#### Technical Details
- **対応ページ**: `https://jp.mercari.com/mypage/merpay/smartpayment/easypay/select`
- **権限**: `activeTab`, `storage`
- **Manifest Version**: 3
- **対応ブラウザ**: Chrome（Chromium系）

#### CSV Export Format
- ヘッダ行なし
- 日付形式: `yyyy-MM-dd`（時間削除）
- 金額形式: 数値のみ（¥マーク・カンマ削除）
- freeeでの直接インポートに対応

#### Security & Privacy
- 個人情報の完全削除
- 秘匿情報の除外
- ローカルストレージのみ使用（外部送信なし）