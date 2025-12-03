// Push only essential source files to GitHub
import { getUncachableGitHubClient } from '../server/github-helper';
import * as fs from 'fs';
import * as path from 'path';

const REPO_OWNER = 'dyllisLev';
const REPO_NAME = 'ai-story-game';

// Collect files recursively from these directories
function getSourceFiles(dir: string, ext: string[] = ['.ts', '.tsx', '.css', '.html']): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getSourceFiles(fullPath, ext));
    } else if (ext.some(e => item.endsWith(e))) {
      files.push(fullPath);
    }
  }
  return files;
}

async function pushToGitHub() {
  try {
    console.log('🔗 GitHub에 연결 중...');
    const octokit = await getUncachableGitHubClient();
    
    console.log('\n📁 소스 파일만 수집 중...');
    
    const files = [
      // Root config files
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'tailwind.config.ts',
      'postcss.config.js',
      'drizzle.config.ts',
      'README.md',
      '.gitignore',
      'init-db.sql',
      'setup.sh',
      // Client source
      ...getSourceFiles('client/src'),
      'client/index.html',
      // Server source
      ...getSourceFiles('server'),
      // Shared
      ...getSourceFiles('shared'),
      // Scripts
      ...getSourceFiles('scripts'),
      'script/build.ts',
    ].filter(f => fs.existsSync(f));
    
    console.log(`✅ ${files.length}개 파일 발견`);
    
    console.log('\n📤 파일 업로드 중 (배치 처리)...');
    
    // Process in smaller batches
    const BATCH_SIZE = 50;
    const tree = [];
    
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      console.log(`  처리 중: ${i + 1}-${Math.min(i + BATCH_SIZE, files.length)}/${files.length}`);
      
      for (const file of batch) {
        const content = fs.readFileSync(file, 'utf-8');
        tree.push({
          path: file,
          mode: '100644' as const,
          type: 'blob' as const,
          content: content.length > 1000000 ? content.substring(0, 1000000) : content, // Limit file size
        });
      }
    }
    
    console.log('\n🌳 Git tree 생성 중...');
    const { data: newTree } = await octokit.rest.git.createTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tree: tree,
    });
    
    console.log('💾 Commit 생성 중...');
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      message: `Initial commit: AI Story Game

✨ Interactive Korean AI story platform
- React + TypeScript frontend
- Express backend
- SQLite database
- Multi-AI support (GPT-4, Claude, Gemini, Grok)

🚀 Quick start:
\`\`\`
npm install
./setup.sh
npm run dev
\`\`\`

Add API keys in Settings and start creating!`,
      tree: newTree.sha,
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
    
    console.log('\n✨ 푸시 완료!');
    console.log(`📦 ${files.length}개 파일 업로드 완료`);
    console.log(`🔗 https://github.com/${REPO_OWNER}/${REPO_NAME}`);
    
  } catch (error: any) {
    console.error('\n❌ 오류:', error.message);
    process.exit(1);
  }
}

pushToGitHub();
