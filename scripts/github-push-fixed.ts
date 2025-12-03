// GitHub API push with proper initialization
import { getUncachableGitHubClient } from '../server/github-helper';
import * as fs from 'fs';
import * as path from 'path';

const REPO_OWNER = 'dyllisLev';
const REPO_NAME = 'ai-story-game';

const EXCLUDE_PATTERNS = [
  'node_modules',
  'dist',
  '.DS_Store',
  'server/public',
  '.db',
  '.db-shm',
  '.db-wal',
  '.log',
  '.replit',
  'replit.nix',
  '.git',
  'vite.config.ts.',
  '.tar.gz'
];

function shouldExclude(filePath: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (shouldExclude(fullPath)) continue;
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function pushToGitHub() {
  try {
    console.log('🔗 GitHub에 연결 중...');
    const octokit = await getUncachableGitHubClient();
    
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ 인증 완료: ${user.login}`);
    
    console.log('\n📁 파일 수집 중...');
    const allFiles = getAllFiles('.');
    console.log(`✅ ${allFiles.length}개 파일 발견`);
    
    console.log('\n📤 파일 업로드 중...');
    
    // Create file contents for tree
    const tree = allFiles.map(file => {
      const content = fs.readFileSync(file, 'utf-8');
      return {
        path: file,
        mode: '100644' as const,
        type: 'blob' as const,
        content: content,
      };
    });
    
    console.log('🌳 Git tree 생성 중...');
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

✨ Features:
- Complete source code
- Database initialization SQL (API keys excluded)
- Setup scripts for easy deployment
- Sample story included

📝 Usage:
1. Clone the repository
2. Run npm install
3. Run ./setup.sh to initialize database
4. Add API keys in Settings
5. Start creating stories!`,
      tree: newTree.sha,
      parents: [],
    });
    
    console.log('🔀 Main branch 생성/업데이트 중...');
    try {
      await octokit.rest.git.createRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: 'refs/heads/main',
        sha: commit.sha,
      });
      console.log('✅ Main branch 생성됨');
    } catch (error: any) {
      if (error.status === 422) {
        // Ref already exists, update it
        await octokit.rest.git.updateRef({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          ref: 'heads/main',
          sha: commit.sha,
          force: true,
        });
        console.log('✅ Main branch 업데이트됨');
      } else {
        throw error;
      }
    }
    
    console.log('\n✨ 완료!');
    console.log(`📦 ${allFiles.length}개 파일이 성공적으로 푸시되었습니다.`);
    console.log(`🔗 https://github.com/${REPO_OWNER}/${REPO_NAME}`);
    console.log('\n📝 다른 서버에서 사용하기:');
    console.log('   git clone https://github.com/dyllisLev/ai-story-game.git');
    console.log('   cd ai-story-game');
    console.log('   npm install');
    console.log('   ./setup.sh');
    console.log('   npm run dev');
    
  } catch (error: any) {
    console.error('\n❌ 오류 발생:', error.message);
    if (error.response?.data) {
      console.error('상세:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

pushToGitHub();
