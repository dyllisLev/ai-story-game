// Script to create GitHub repository and push code
import { getUncachableGitHubClient } from '../server/github-helper';
import { execSync } from 'child_process';
import * as fs from 'fs';

async function createGitHubRepo() {
  try {
    console.log('🔗 GitHub에 연결 중...');
    const octokit = await getUncachableGitHubClient();
    
    // Get authenticated user
    const { data: user } = await octokit.rest.users.getAuthenticated();
    console.log(`✅ GitHub 사용자: ${user.login}`);
    
    const repoName = 'ai-story-game';
    const repoDescription = 'Interactive Korean AI story/roleplay platform with multiple AI models (ChatGPT, Claude, Gemini, Grok)';
    
    console.log(`\n📦 레파지토리 생성 중: ${repoName}...`);
    
    // Create repository
    const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
      name: repoName,
      description: repoDescription,
      private: false,
      auto_init: false,
    });
    
    console.log(`✅ 레파지토리 생성 완료: ${repo.html_url}`);
    
    // Create .gitignore if it doesn't exist
    if (!fs.existsSync('.gitignore')) {
      const gitignore = `
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
*.db
*.db-shm
*.db-wal
.replit
replit.nix
`;
      fs.writeFileSync('.gitignore', gitignore.trim());
      console.log('✅ .gitignore 파일 생성 완료');
    }
    
    // Create README.md
    const readme = `# AI Story Game (Crack AI)

Interactive Korean AI story/roleplay platform with multiple AI models.

## Features

- 🎭 **Interactive Story Creation**: Create custom story templates with comprehensive settings
- 🤖 **Multiple AI Models**: Support for ChatGPT, Claude, Gemini, and Grok
- 💬 **Real-time Chat**: Stream AI responses with markdown rendering
- 📝 **Session Management**: Multiple independent playthroughs per story
- 🎨 **Beautiful UI**: Modern, responsive design with dark mode support
- 🔧 **Flexible Configuration**: Customizable prompts, conversation profiles, and model settings

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: SQLite with Drizzle ORM
- **Build Tool**: Vite
- **AI APIs**: OpenAI, Anthropic, Google Gemini, xAI (Grok)

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Set up your API keys in the settings page

3. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

4. Open your browser at \`http://localhost:5000\`

## Database Schema

- **stories**: Story templates with settings and metadata
- **sessions**: Individual playthroughs with session-specific settings
- **messages**: Chat history for each session
- **settings**: Application configuration and API keys

## License

MIT

---

Built with ❤️ on Replit
`;
    fs.writeFileSync('README.md', readme);
    console.log('✅ README.md 파일 생성 완료');
    
    console.log('\n📤 Git 저장소 초기화 및 푸시 준비...');
    console.log('\n⚠️  다음 명령어를 Shell에서 직접 실행해주세요:');
    console.log('\n```bash');
    console.log('git init');
    console.log('git add .');
    console.log('git commit -m "Initial commit: AI Story Game platform"');
    console.log(`git remote add origin ${repo.clone_url}`);
    console.log('git branch -M main');
    console.log('git push -u origin main');
    console.log('```');
    
    console.log(`\n✨ 레파지토리 URL: ${repo.html_url}`);
    
  } catch (error: any) {
    if (error.status === 422) {
      console.error('❌ 레파지토리가 이미 존재합니다. 다른 이름을 선택해주세요.');
    } else {
      console.error('❌ 오류 발생:', error.message);
    }
    process.exit(1);
  }
}

createGitHubRepo();
