# Crack AI - AI 스토리 롤플레이 게임

한국어 기반 AI 인터랙티브 스토리/롤플레이 플랫폼. 여러 AI 모델로 자신만의 스토리를 만들고 플레이하세요.

## ✨ 주요 기능

- 🎭 **인터랙티브 스토리 생성**: 상세한 설정으로 스토리 템플릿 제작
- 🤖 **다중 AI 모델 지원**: ChatGPT, Claude, Gemini, Grok 지원
- 💬 **실시간 채팅**: 스트리밍 AI 응답 및 마크다운 렌더링
- 📝 **세션 관리**: 스토리별 독립적인 플레이스루 저장
- 👤 **계정별 API 키 관리**: 사용자마다 개별 AI API 키 설정 가능
- 🎨 **모던 UI**: 반응형 디자인 및 다크 모드 지원
- 🔧 **유연한 설정**: 대화 프로필, 프롬프트 커스터마이징

## 🚀 빠른 시작 (3단계)

```bash
# 1. 저장소 클론
git clone https://github.com/dyllisLev/ai-story-game.git
cd ai-story-game

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # SESSION_SECRET만 랜덤 값으로 변경

# 3. 설치 및 실행
npm install
npm run dev
```

브라우저에서 **http://localhost:5000** 접속!

## 📝 환경 변수 설정

`.env` 파일에서 **SESSION_SECRET만 변경**하면 됩니다:

```bash
# 랜덤 SECRET 생성
openssl rand -base64 32

# .env 파일의 SESSION_SECRET에 붙여넣기
SESSION_SECRET=생성된랜덤값
```

**Supabase 연결 정보는 이미 설정되어 있어 변경 불필요**합니다.

## 🛠️ 기술 스택

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Database**: Supabase PostgreSQL
- **Build Tool**: Vite
- **AI APIs**: OpenAI, Anthropic, Google Gemini, xAI (Grok)

## 📦 프로젝트 구조

```
ai-story-game/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── components/    # UI 컴포넌트
│   │   └── lib/           # 유틸리티 및 API 클라이언트
│   └── index.html
├── server/                # Express 백엔드
│   ├── index.ts           # 메인 서버
│   ├── routes.ts          # API 라우트
│   ├── storage.ts         # DB 레이어
│   ├── supabase.ts        # Supabase 클라이언트
│   └── supabase-mappers.ts  # snake_case ↔ camelCase 매퍼
├── shared/                # 공유 타입 및 스키마
│   └── schema.ts          # 타입 정의
├── supabase-schema.sql    # DB 스키마 (참고용)
└── package.json
```

## 💻 개발 명령어

```bash
# 개발 모드
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start

# 타입 체크
npm run check
```

## 🔑 AI API 키 설정

회원가입 후 **계정 관리** 페이지에서 각자의 API 키를 설정하세요:

- **OpenAI API Key**: https://platform.openai.com/api-keys
- **Anthropic API Key**: https://console.anthropic.com/
- **Google AI API Key**: https://aistudio.google.com/apikey
- **xAI API Key**: https://console.x.ai/

각 사용자는 자신만의 API 키를 사용하며, 앱 설정에서 언제든지 변경 가능합니다.

## 🗄️ 데이터베이스 스키마

- **users**: 사용자 계정 및 개별 API 키 저장
- **stories**: 스토리 템플릿 및 메타데이터
- **sessions**: 스토리별 플레이스루 (사용자별)
- **messages**: 세션별 대화 기록
- **settings**: 전역 설정 (시스템 프롬프트 등)

## 🐳 Docker 배포 (선택사항)

```bash
# Docker 이미지 빌드
docker build -t crack-ai .

# 실행
docker run -d \
  -p 5000:5000 \
  -e SESSION_SECRET=your-secret-here \
  --name crack-ai \
  crack-ai
```

## 🚨 문제 해결

### "Missing Supabase environment variables" 오류

`.env` 파일이 있는지 확인하세요:

```bash
cp .env.example .env
```

### 포트 5000이 이미 사용 중

다른 포트로 실행:

```bash
PORT=8080 npm run dev
```

### EMFILE: too many open files (Linux)

```bash
sudo sysctl fs.inotify.max_user_watches=524288
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 📚 상세 설치 가이드

완전히 새로운 서버에서 설치하는 방법은 **COMPLETE_SETUP_GUIDE.md**를 참고하세요.

## 📄 라이선스

MIT

---

Made with ❤️ by Crack AI Team
