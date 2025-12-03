// Simple GitHub push for key files only
import { getUncachableGitHubClient } from '../server/github-helper';
import * as fs from 'fs';
import * as path from 'path';

const REPO_OWNER = 'dyllisLev';
const REPO_NAME = 'ai-story-game';

// Only include essential files
const ESSENTIAL_FILES = [
  'README.md',
  'package.json',
  '.gitignore',
  'init-db.sql',
  'setup.sh',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.ts',
  'postcss.config.js',
  'drizzle.config.ts',
  // Client
  'client/index.html',
  'client/src/main.tsx',
  'client/src/App.tsx',
  'client/src/index.css',
  // Server
  'server/index.ts',
  'server/routes.ts',
  'server/storage.ts',
  'server/github-helper.ts',
  // Shared
  'shared/schema.ts',
  // Scripts
  'scripts/setup-db.ts',
  'scripts/export-init-db.ts',
  'script/build.ts',
];

async function pushEssentialFiles() {
  try {
    console.log('🔗 GitHub에 연결 중...');
    const octokit = await getUncachableGitHubClient();
    
    console.log('\n📦 핵심 파일 업로드 중...');
    
    // Get all source files
    const allFiles = [
      ...ESSENTIAL_FILES,
      ...getAllFilesInDir('client/src'),
      ...getAllFilesInDir('server'),
      ...getAllFilesInDir('shared'),
    ].filter((file, index, self) => self.indexOf(file) === index); // Remove duplicates
    
    const existingFiles = allFiles.filter(file => fs.existsSync(file));
    console.log(`✅ ${existingFiles.length}개 파일 발견\n`);
    
    // Create blobs
    const blobs = [];
    for (const file of existingFiles) {
      try {
        const content = fs.readFileSync(file);
        const { data } = await octokit.rest.git.createBlob({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          content: content.toString('base64'),
          encoding: 'base64',
        });
        blobs.push({
          path: file,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: data.sha,
        });
        console.log(`  ✓ ${file}`);
      } catch (error: any) {
        console.log(`  ⚠ Skipped ${file}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ ${blobs.length}개 파일 업로드 완료`);
    
    console.log('\n🌳 Git tree 생성 중...');
    const { data: tree } = await octokit.rest.git.createTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tree: blobs,
    });
    
    console.log('💾 Commit 생성 중...');
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      message: `Initial commit: AI Story Game platform

- Complete source code
- Database initialization (API keys excluded)
- Setup scripts and documentation
- Ready to deploy: just add API keys!`,
      tree: tree.sha,
      parents: [],
    });
    
    console.log('🔀 Main branch 업데이트 중...');
    try {
      await octokit.rest.git.createRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: 'refs/heads/main',
        sha: commit.sha,
      });
    } catch {
      await octokit.rest.git.updateRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: 'heads/main',
        sha: commit.sha,
        force: true,
      });
    }
    
    console.log('\n✨ 완료!');
    console.log(`📦 ${blobs.length}개 파일이 성공적으로 푸시되었습니다.`);
    console.log(`🔗 https://github.com/${REPO_OWNER}/${REPO_NAME}`);
    
  } catch (error: any) {
    console.error('\n❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

function getAllFilesInDir(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      getAllFilesInDir(fullPath, files);
    } else if (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.css')) {
      files.push(fullPath);
    }
  }
  return files;
}

pushEssentialFiles();
