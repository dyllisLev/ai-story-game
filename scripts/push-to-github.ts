// Push all code to GitHub using API
import { getUncachableGitHubClient } from '../server/github-helper';
import * as fs from 'fs';
import * as path from 'path';

const REPO_OWNER = 'dyllisLev';
const REPO_NAME = 'ai-story-game';

// Files/directories to exclude (same as .gitignore)
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
  return EXCLUDE_PATTERNS.some(pattern => {
    if (pattern.startsWith('.')) {
      return filePath.endsWith(pattern) || filePath.includes(`/${pattern}`);
    }
    return filePath.includes(pattern);
  });
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const relativePath = path.relative(process.cwd(), filePath);
    
    if (shouldExclude(relativePath)) {
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(relativePath);
    }
  });

  return arrayOfFiles;
}

async function pushToGitHub() {
  try {
    console.log('🔗 GitHub에 연결 중...');
    const octokit = await getUncachableGitHubClient();
    
    console.log('📁 업로드할 파일 수집 중...');
    const files = getAllFiles(process.cwd());
    console.log(`✅ ${files.length}개 파일 발견`);
    
    // Create blobs for each file
    console.log('\n📤 파일 업로드 중...');
    const blobs = await Promise.all(
      files.map(async (file) => {
        const content = fs.readFileSync(file);
        const { data } = await octokit.rest.git.createBlob({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          content: content.toString('base64'),
          encoding: 'base64',
        });
        console.log(`  ✓ ${file}`);
        return {
          path: file,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: data.sha,
        };
      })
    );
    
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
      message: 'Initial commit: AI Story Game platform\n\nInteractive Korean AI story/roleplay platform with multiple AI models',
      tree: tree.sha,
      parents: [],
    });
    
    console.log('🔀 Main branch 업데이트 중...');
    await octokit.rest.git.createRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: 'refs/heads/main',
      sha: commit.sha,
    }).catch(async () => {
      // If ref already exists, update it
      await octokit.rest.git.updateRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: 'heads/main',
        sha: commit.sha,
        force: true,
      });
    });
    
    console.log('\n✨ 완료!');
    console.log(`📦 ${files.length}개 파일이 성공적으로 푸시되었습니다.`);
    console.log(`🔗 레파지토리: https://github.com/${REPO_OWNER}/${REPO_NAME}`);
    
  } catch (error: any) {
    console.error('❌ 오류 발생:', error.message);
    if (error.response) {
      console.error('상세 정보:', error.response.data);
    }
    process.exit(1);
  }
}

pushToGitHub();
