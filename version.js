#!/usr/bin/env node

/**
 * バージョン管理スクリプト
 * プロジェクト全体のバージョンを統一管理します
 */

import fs from 'fs';

const VERSION_FILE = 'version.json';

// バージョン情報を管理するファイル
const versionConfig = {
  version: '0.0.0',
  lastUpdated: new Date().toISOString()
};

// バージョンファイルを作成/更新
function updateVersionFile() {
  fs.writeFileSync(VERSION_FILE, JSON.stringify(versionConfig, null, 2));
  console.log(`✅ Version file updated: ${versionConfig.version}`);
}

// package.jsonのバージョンを更新
function updatePackageJson(filePath) {
  if (!fs.existsSync(filePath)) return;

  const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  packageJson.version = versionConfig.version;
  fs.writeFileSync(filePath, JSON.stringify(packageJson, null, 2));
  console.log(`✅ Updated ${filePath}: ${versionConfig.version}`);
}

// manifest.jsonのバージョンを更新
function updateManifestJson(filePath) {
  if (!fs.existsSync(filePath)) return;

  const manifestJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  manifestJson.version = versionConfig.version;
  fs.writeFileSync(filePath, JSON.stringify(manifestJson, null, 2));
  console.log(`✅ Updated ${filePath}: ${versionConfig.version}`);
}

// バージョンを設定
function setVersion(version) {
  versionConfig.version = version;
  versionConfig.lastUpdated = new Date().toISOString();

  updateVersionFile();
  updatePackageJson('package.json');
  updatePackageJson('extension/package.json');
  updateManifestJson('extension/manifest.json');

  console.log(`🎉 Version updated to ${version} across all files`);
}

// 現在のバージョンを表示
function showVersion() {
  if (fs.existsSync(VERSION_FILE)) {
    const current = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    console.log(`Current version: ${current.version}`);
    console.log(`Last updated: ${current.lastUpdated}`);
  } else {
    console.log(
      'No version file found. Run with --set <version> to initialize.'
    );
  }
}

// メイン処理
const args = process.argv.slice(2);

if (args.length === 0) {
  showVersion();
} else if (args[0] === '--set' && args[1]) {
  setVersion(args[1]);
} else {
  console.log('Usage:');
  console.log('  node version.js                    # Show current version');
  console.log(
    '  node version.js --set <version>   # Set version across all files'
  );
  console.log('');
  console.log('Examples:');
  console.log('  node version.js --set 1.0.0');
  console.log('  node version.js --set 1.1.0');
}
