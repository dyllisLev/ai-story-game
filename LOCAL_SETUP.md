# Replit 개발 환경 복제 가이드

## 📋 Replit 환경 사양

- **OS**: Ubuntu 24.04.2 LTS (Noble Numbat)
- **Node.js**: v20.19.3
- **npm**: 10.8.2
- **PostgreSQL**: 16.10
- **Nix Channel**: stable-24_05

## 🚀 로컬 환경 설정

### 1. Node.js 설치

**정확한 버전 설치 (권장):**
```bash
# nvm 사용
nvm install 20.19.3
nvm use 20.19.3

# 또는 직접 다운로드
# https://nodejs.org/download/release/v20.19.3/
```

**최신 Node.js 20.x 사용:**
```bash
# nvm 사용
nvm install 20
nvm use 20

# 또는 Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. PostgreSQL 16 설치 (Optional - SQLite 사용 중)

**주의:** 현재 프로젝트는 SQLite를 사용하고 있지만, 설정 파일에 PostgreSQL이 준비되어 있습니다.

**Ubuntu/Debian:**
```bash
# PostgreSQL 공식 저장소 추가
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc &>/dev/null

# PostgreSQL 16 설치
sudo apt update
sudo apt install postgresql-16
```

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Docker 사용 (가장 쉬움):**
```bash
docker run -d \
  --name postgres16 \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=storycracker \
  -p 5432:5432 \
  postgres:16-alpine
```

### 3. 프로젝트 설정

```bash
# 저장소 클론 또는 다운로드
git clone <repository-url>
cd story-cracker-ai

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 데이터베이스 초기화 (SQLite - 자동 생성됨)
npm run db:push

# 개발 서버 실행
npm run dev
```

### 4. 환경 변수 설정

`.env` 파일 생성:

```env
# 서버 설정
NODE_ENV=development
PORT=5000

# 세션 암호화 키 (32자 이상 랜덤 문자열)
SESSION_SECRET=your-secret-key-change-this-in-production

# PostgreSQL (사용하는 경우)
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/storycracker

# AI API 키들은 사용자가 웹 UI에서 설정
```

### 5. 개발 서버 실행

```bash
# 개발 모드 (Replit과 동일)
npm run dev

# 브라우저에서 열기
# http://localhost:5000
```

## 📦 프로덕션 빌드

```bash
# 빌드
npm run build

# 프로덕션 실행
npm start
```

## 🐳 Docker로 실행 (완전히 동일한 환경)

가장 간단하게 Replit과 동일한 환경을 만드는 방법:

```bash
# Docker 이미지 빌드
docker build -t story-cracker-ai .

# 실행
docker run -d \
  -p 5000:5000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/data:/app/data \
  -e SESSION_SECRET=your-secret-key \
  --name story-cracker-ai \
  story-cracker-ai

# 또는 docker-compose 사용
docker-compose up -d
```

## 🔍 버전 확인

설치 후 버전 확인:

```bash
node --version    # v20.19.3 (또는 v20.x.x)
npm --version     # 10.8.2 (또는 10.x.x)
psql --version    # PostgreSQL 16.x (선택사항)
```

## 🛠️ IDE 설정

### VS Code (권장)

**추천 확장:**
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense

**settings.json:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

## 📝 주요 차이점

| 항목 | Replit | 로컬 |
|------|--------|------|
| OS | Ubuntu 24.04 | 사용자 OS |
| 패키지 관리 | Nix | npm/Node.js |
| 데이터베이스 | 내장 SQLite | 로컬 SQLite 파일 |
| 포트 | 5000 (자동 매핑) | 5000 (직접 접근) |
| 환경 변수 | Replit Secrets | .env 파일 |
| 파일 저장소 | Replit 파일 시스템 | 로컬 파일 시스템 |

## 🚨 문제 해결

### 포트 충돌
```bash
# 다른 포트 사용
PORT=3000 npm run dev
```

### SQLite 권한 오류
```bash
# 데이터 폴더 권한 설정
chmod -R 755 data/
```

### npm 의존성 오류
```bash
# 캐시 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

### TypeScript 오류
```bash
# 타입 체크
npm run check
```

## 📚 추가 리소스

- [Node.js 공식 문서](https://nodejs.org/)
- [PostgreSQL 공식 문서](https://www.postgresql.org/)
- [Docker 공식 문서](https://docs.docker.com/)
- [Replit 문서](https://docs.replit.com/)
