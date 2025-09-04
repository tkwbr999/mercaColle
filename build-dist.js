#!/usr/bin/env node

/**
 * 配布用ZIPファイル作成スクリプト
 * テストファイルを除外して配布用ZIPを作成します
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const EXTENSION_DIR = 'extension';
const OUTPUT_DIR = 'dist';

// 配布に含めるファイル・ディレクトリ
const INCLUDE_PATTERNS = [
  'manifest.json',
  'popup/**/*',
  'src/**/*',
  'assets/**/*',
  'LICENSE'
];

// 配布から除外するファイル・ディレクトリ
const EXCLUDE_PATTERNS = [
  'node_modules/**/*',
  'tests/**/*',
  'coverage/**/*',
  '.git/**/*',
  '*.log',
  'package-lock.json',
  '.DS_Store',
  'dist/**/*',
  'build/**/*',
  '.env*',
  '*.tmp',
  '*.temp',
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'llms.txt',
  '.prettierrc',
  'eslint.config.js',
  '.gitignore',
  'tests'
];

function createDistDirectory() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function getVersion() {
  const manifestPath = path.join(EXTENSION_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return manifest.version;
}

function createZipFile() {
  const version = getVersion();
  const zipName = `mercaColle-extension-v${version}.zip`;
  const zipPath = path.join(OUTPUT_DIR, zipName);

  console.log(`📦 Creating distribution ZIP: ${zipName}`);

  try {
    // 配布用ファイルのみをコピーしてからZIP作成
    const tempDir = path.join(OUTPUT_DIR, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // 必要なファイルのみをコピー
    const filesToCopy = ['manifest.json', 'popup', 'src', 'assets', 'LICENSE'];

    filesToCopy.forEach(item => {
      const sourcePath = path.join(EXTENSION_DIR, item);
      const destPath = path.join(tempDir, item);

      if (fs.existsSync(sourcePath)) {
        if (fs.statSync(sourcePath).isDirectory()) {
          fs.cpSync(sourcePath, destPath, { recursive: true });
        } else {
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    });

    // ZIP作成
    const command = `cd ${tempDir} && zip -r ../${zipName} .`;
    execSync(command, { stdio: 'inherit' });

    // 一時ディレクトリを削除
    fs.rmSync(tempDir, { recursive: true });

    console.log(`✅ Distribution ZIP created: ${zipPath}`);
    console.log(
      `📁 File size: ${(fs.statSync(zipPath).size / 1024).toFixed(2)} KB`
    );

    return zipPath;
  } catch (error) {
    console.error('❌ Failed to create ZIP file:', error.message);
    process.exit(1);
  }
}

function listIncludedFiles() {
  console.log('\n📋 Files included in distribution:');
  INCLUDE_PATTERNS.forEach(pattern => {
    console.log(`  ✅ ${pattern}`);
  });
}

function listExcludedFiles() {
  console.log('\n🚫 Files excluded from distribution:');
  EXCLUDE_PATTERNS.forEach(pattern => {
    console.log(`  ❌ ${pattern}`);
  });
}

function main() {
  console.log('🚀 mercaColle Extension Distribution Builder');
  console.log('===========================================');

  const version = getVersion();
  console.log(`📌 Version: ${version}`);

  listIncludedFiles();
  listExcludedFiles();

  createDistDirectory();
  const zipPath = createZipFile();

  console.log('\n🎉 Distribution build completed successfully!');
  console.log(`📦 ZIP file: ${zipPath}`);
  console.log('\n📝 Next steps:');
  console.log('  1. Test the ZIP file by loading it as an unpacked extension');
  console.log('  2. Upload to Chrome Web Store or distribute manually');
}

// ESモジュールでのメイン実行チェック
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
