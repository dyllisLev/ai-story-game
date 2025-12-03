// Initialize GitHub repo with README first, then push all files
import { getUncachableGitHubClient } from '../server/github-helper';
import * as fs from 'fs';
import * as path from 'path';

const REPO_OWNER = 'dyllisLev';
const REPO_NAME = 'ai-story-game';

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

async function initAndPush() {
  try {
    console.log('🔗 GitHub에 연결 중...');
    const octokit = await getUncachableGitHubClient();
    
    // Step 1: Create initial commit with README
    console.log('\n📄 README로 레파지토리 초기화 중...');
    const readmeContent = fs.readFileSync('README.md', 'utf-8');
    
    try {
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: 'README.md',
        message: 'Initial commit: Add README',
        content: Buffer.from(readmeContent).toString('base64'),
      });
      console.log('✅ README 추가됨');
    } catch (error: any) {
      console.log('ℹ️  README 이미 존재하거나 초기화됨');
    }
    
    // Step 2: Get the latest commit SHA
    const { data: ref } = await octokit.rest.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: 'heads/main',
    });
    const latestCommitSha = ref.object.sha;
    
    // Step 3: Collect all files
    console.log('\n📁 모든 소스 파일 수집 중...');
    const files = [
      // Root config files
      'package.json',
      'package-lock.json',
      '.nvmrc',
      'tsconfig.json',
      'vite.config.ts',
      'vite-plugin-meta-images.ts',
      'tailwind.config.ts',
      'postcss.config.js',
      'drizzle.config.ts',
      'README.md',
      'DEPLOY_GUIDE.md',
      'QUICK_FIX.md',
      '.gitignore',
      'init-db.sql',
      'setup.sh',
      'components.json',
      // Client source
      ...getSourceFiles('client/src'),
      'client/index.html',
      // Server source
      ...getSourceFiles('server'),
      // Shared
      ...getSourceFiles('shared'),
      // Scripts
      'scripts/setup-db.ts',
      'scripts/export-init-db.ts',
      'script/build.ts',
    ].filter(f => fs.existsSync(f));
    
    console.log(`✅ ${files.length}개 파일 발견`);
    
    // Step 4: Create tree
    console.log('\n🌳 Git tree 생성 중...');
    const tree = files.map(file => ({
      path: file,
      mode: '100644' as const,
      type: 'blob' as const,
      content: fs.readFileSync(file, 'utf-8'),
    }));
    
    const { data: newTree } = await octokit.rest.git.createTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      base_tree: latestCommitSha,
      tree: tree,
    });
    
    // Step 5: Create commit
    console.log('💾 Commit 생성 중...');
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      message: `Complete source code push

✨ Features:
- Full React + TypeScript source
- Database initialization (API keys excluded)
- Setup scripts and deployment guides
- Sample story included
- All necessary config files (vite-plugin-meta-images.ts 포함!)

🚀 Quick start:
\`\`\`bash
git clone https://github.com/${REPO_OWNER}/${REPO_NAME}.git
cd ${REPO_NAME}
npm install
./setup.sh
npm run dev
\`\`\`

Then add API keys in Settings!`,
      tree: newTree.sha,
      parents: [latestCommitSha],
    });
    
    // Step 6: Update main branch
    console.log('🔀 Main branch 업데이트 중...');
    await octokit.rest.git.updateRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: 'heads/main',
      sha: commit.sha,
    });
    
    console.log('\n✨ 푸시 완료!');
    console.log(`📦 ${files.length}개 파일 업로드 완료`);
    console.log(`🔗 https://github.com/${REPO_OWNER}/${REPO_NAME}`);
    console.log('\n📝 이제 다른 서버에서:');
    console.log('   git clone https://github.com/dyllisLev/ai-story-game.git');
    console.log('   cd ai-story-game');
    console.log('   npm install');
    console.log('   ./setup.sh');
    console.log('   npm run dev');
    console.log('\n✅ vite-plugin-meta-images.ts 포함되었습니다!');
    
  } catch (error: any) {
    console.error('\n❌ 오류:', error.message);
    if (error.response?.data) {
      console.error('상세:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

initAndPush();
