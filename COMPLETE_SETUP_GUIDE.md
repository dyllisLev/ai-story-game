# Crack AI - 완전한 설치 가이드 (새 서버용)

> 이 가이드는 빈 서버에서 처음부터 Crack AI를 설치하고 실행하는 전체 과정을 다룹니다.

## 📋 목차

1. [사전 준비](#1-사전-준비)
2. [서버 환경 설정](#2-서버-환경-설정)
3. [프로젝트 다운로드](#3-프로젝트-다운로드)
4. [Supabase 데이터베이스 설정](#4-supabase-데이터베이스-설정)
5. [환경 변수 설정](#5-환경-변수-설정)
6. [애플리케이션 실행](#6-애플리케이션-실행)
7. [프로덕션 배포](#7-프로덕션-배포)

---

## 1. 사전 준비

### 필수 요구사항
- **OS**: Ubuntu 20.04+ / CentOS 7+ / macOS 12+
- **메모리**: 최소 2GB RAM
- **디스크**: 최소 10GB 여유 공간
- **Supabase 접속 정보** (이미 제공됨)

### 필요한 소프트웨어
- Node.js v20.19.3 (또는 v20.x 이상)
- npm v10.8.2 (Node.js와 함께 설치됨)
- Git

---

## 2. 서버 환경 설정

### Step 1: Node.js 설치

#### Ubuntu/Debian
```bash
# Node.js 20.x 저장소 추가
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js 설치
sudo apt-get install -y nodejs

# 버전 확인
node --version  # v20.x.x 출력 확인
npm --version   # 10.x.x 출력 확인
```

#### CentOS/RHEL
```bash
# Node.js 20.x 저장소 추가
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# Node.js 설치
sudo yum install -y nodejs

# 버전 확인
node --version
npm --version
```

#### macOS
```bash
# Homebrew 사용
brew install node@20

# 또는 nvm 사용 (권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # 또는 ~/.zshrc
nvm install 20.19.3
nvm use 20.19.3
```

### Step 2: Git 설치

```bash
# Ubuntu/Debian
sudo apt-get install -y git

# CentOS/RHEL
sudo yum install -y git

# macOS
brew install git
```

---

## 3. 프로젝트 다운로드

### 방법 1: Git Clone (권장)

```bash
# 홈 디렉토리로 이동
cd ~

# GitHub에서 클론
git clone https://github.com/dyllisLev/ai-story-game.git

# 프로젝트 디렉토리로 이동
cd ai-story-game
```

### 방법 2: ZIP 파일 다운로드

```bash
# ZIP 다운로드
wget https://github.com/dyllisLev/ai-story-game/archive/refs/heads/main.zip

# 압축 해제
unzip main.zip
cd ai-story-game-main
```

### 의존성 설치

```bash
# npm 패키지 설치
npm install

# 설치 완료까지 약 2-3분 소요
```

---

## 4. Supabase 데이터베이스 설정

### Step 1: Supabase 대시보드 접속

1. 브라우저에서 **https://supa.nuc.hmini.me** 접속
2. 관리자 계정으로 로그인

### Step 2: 데이터베이스 스키마 생성

1. 좌측 사이드바에서 **SQL Editor** 클릭
2. **New Query** 버튼 클릭
3. 다음 SQL 전체를 복사해서 붙여넣기:

```sql
-- Crack AI - Supabase Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT,
  profile_image TEXT,
  role TEXT DEFAULT 'user',
  api_key_chatgpt TEXT,
  api_key_grok TEXT,
  api_key_claude TEXT,
  api_key_gemini TEXT,
  ai_model_chatgpt TEXT DEFAULT 'gpt-4o',
  ai_model_grok TEXT DEFAULT 'grok-beta',
  ai_model_claude TEXT DEFAULT 'claude-3-5-sonnet-20241022',
  ai_model_gemini TEXT DEFAULT 'gemini-2.0-flash',
  conversation_profiles TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL
);

-- Stories table
CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image TEXT,
  genre TEXT,
  author TEXT,
  story_settings TEXT,
  prologue TEXT,
  prompt_template TEXT,
  example_user_input TEXT,
  example_ai_response TEXT,
  starting_situation TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  conversation_profile TEXT,
  user_note TEXT,
  summary_memory TEXT,
  session_model TEXT,
  session_provider TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  character TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_story_id ON sessions(story_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all on settings" ON settings;
DROP POLICY IF EXISTS "Allow read stories" ON stories;
DROP POLICY IF EXISTS "Allow all on stories" ON stories;
DROP POLICY IF EXISTS "Allow all on users" ON users;
DROP POLICY IF EXISTS "Allow all on sessions" ON sessions;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;

-- RLS Policies (서버에서 관리하므로 모두 허용)
CREATE POLICY "Allow all on settings" ON settings FOR ALL USING (true);
CREATE POLICY "Allow read stories" ON stories FOR SELECT USING (true);
CREATE POLICY "Allow all on stories" ON stories FOR ALL USING (true);
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all on sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true);
```

4. **Run** (또는 F5) 버튼을 눌러 실행
5. "Success. No rows returned" 메시지 확인

---

## 5. 환경 변수 설정

### Step 1: .env 파일 생성

프로젝트 루트 디렉토리에서:

```bash
# .env 파일 생성
nano .env
```

### Step 2: 환경 변수 입력

다음 내용을 복사해서 붙여넣기:

```env
# Server Configuration
NODE_ENV=production
PORT=5000

# Session Secret (32자 이상의 랜덤 문자열 - 반드시 변경!)
SESSION_SECRET=your-super-secret-session-key-change-this-to-random-32-chars-or-more

# Supabase Connection (이미 설정된 값 사용)
SUPABASE_URL=https://supa.nuc.hmini.me
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzM5ODA0NDAwLAogICJleHAiOiAxODk3NTcwODAwCn0.AFXH3OIGsCoWsWF9XVQLtN90OLC9g-_AjoeIfxVPfeE

# AI API Keys (Optional - 사용자가 웹 UI에서 설정 가능)
# 이 키들은 fallback용이며, 사용자가 계정 설정에서 개별 키 설정 가능
# API_KEY_CHATGPT=sk-...
# API_KEY_GEMINI=...
# API_KEY_CLAUDE=...
# API_KEY_GROK=...
```

### Step 3: SESSION_SECRET 생성 (중요!)

보안을 위해 랜덤 SECRET 키 생성:

```bash
# 랜덤 32자 문자열 생성
openssl rand -base64 32

# 출력된 값을 .env 파일의 SESSION_SECRET에 붙여넣기
```

예시:
```env
SESSION_SECRET=8xK9mN2pQ4rT6vW8yZ1aC3eF5gH7jL0nP2sU4wX6zA8=
```

파일 저장: `Ctrl+O` → `Enter` → `Ctrl+X`

---

## 6. 애플리케이션 실행

### 개발 모드로 실행 (테스트용)

```bash
# 개발 서버 실행
npm run dev

# 성공 시 출력:
# ✓ Supabase client initialized
# 12:00:00 AM [express] serving on port 5000
```

브라우저에서 접속:
- **로컬**: http://localhost:5000
- **서버 IP**: http://YOUR_SERVER_IP:5000

### 백그라운드 실행 (지속 실행)

#### 방법 1: PM2 사용 (권장)

```bash
# PM2 설치
sudo npm install -g pm2

# 프로덕션 빌드
npm run build

# PM2로 실행
pm2 start npm --name "crack-ai" -- start

# 부팅 시 자동 시작 설정
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
pm2 save

# 상태 확인
pm2 status

# 로그 확인
pm2 logs crack-ai
```

#### 방법 2: systemd 서비스 (Ubuntu/CentOS)

```bash
# 서비스 파일 생성
sudo nano /etc/systemd/system/crack-ai.service
```

다음 내용 입력:

```ini
[Unit]
Description=Crack AI Story Game
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/home/YOUR_USERNAME/ai-story-game
ExecStart=/usr/bin/npm start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**YOUR_USERNAME**을 실제 사용자명으로 변경!

서비스 시작:

```bash
# 서비스 활성화
sudo systemctl daemon-reload
sudo systemctl enable crack-ai
sudo systemctl start crack-ai

# 상태 확인
sudo systemctl status crack-ai

# 로그 확인
sudo journalctl -u crack-ai -f
```

---

## 7. 프로덕션 배포

### 방화벽 설정

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 5000/tcp
sudo ufw reload

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```

### Nginx 리버스 프록시 (선택사항)

80 포트로 접속하게 하려면:

```bash
# Nginx 설치
sudo apt-get install -y nginx  # Ubuntu
sudo yum install -y nginx      # CentOS

# 설정 파일 생성
sudo nano /etc/nginx/sites-available/crack-ai
```

설정 내용:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 도메인 또는 IP

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Nginx 활성화:

```bash
# Ubuntu
sudo ln -s /etc/nginx/sites-available/crack-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# CentOS
sudo cp /etc/nginx/sites-available/crack-ai /etc/nginx/conf.d/crack-ai.conf
sudo nginx -t
sudo systemctl restart nginx
```

---

## 8. 확인 및 테스트

### 1. 서버 접속 확인

브라우저에서:
- http://YOUR_SERVER_IP:5000 (직접 접속)
- http://YOUR_DOMAIN (Nginx 사용 시)

### 2. 회원가입 및 로그인

1. 회원가입 페이지에서 계정 생성
2. 로그인
3. **계정 관리** → **API 키** 탭에서 AI API 키 입력

### 3. 스토리 생성 및 플레이

1. 홈 페이지 → **새 스토리 만들기**
2. 스토리 정보 입력 후 생성
3. **새로 시작** 또는 **이어서 플레이** 클릭
4. AI와 대화 테스트

---

## 9. 유지보수

### 로그 확인

```bash
# PM2 사용 시
pm2 logs crack-ai

# systemd 사용 시
sudo journalctl -u crack-ai -f
```

### 업데이트

```bash
cd ~/ai-story-game
git pull origin main
npm install
npm run build
pm2 restart crack-ai  # 또는 sudo systemctl restart crack-ai
```

### 백업

```bash
# Supabase 대시보드에서 자동 백업 제공
# Settings → Database → Backups

# 또는 수동 백업
cd ~/ai-story-game
tar -czf backup-$(date +%Y%m%d).tar.gz .env uploads/
```

---

## 🚨 문제 해결

### "Cannot connect to Supabase" 오류

```bash
# 환경 변수 확인
cat .env | grep SUPABASE

# Supabase URL 연결 테스트
curl https://supa.nuc.hmini.me
```

### "Port 5000 already in use" 오류

```bash
# 5000 포트 사용 중인 프로세스 확인
sudo lsof -i :5000

# 프로세스 종료
sudo kill -9 PID

# 또는 다른 포트 사용
PORT=8080 npm start
```

### 메모리 부족

```bash
# 스왑 메모리 추가 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 📞 지원

문제가 발생하면:
1. 로그 확인 (`pm2 logs` 또는 `journalctl`)
2. GitHub Issues: https://github.com/dyllisLev/ai-story-game/issues

---

## ✅ 설치 완료 체크리스트

- [ ] Node.js v20.x 설치 완료
- [ ] 프로젝트 다운로드 및 의존성 설치 완료
- [ ] Supabase 데이터베이스 스키마 생성 완료
- [ ] .env 파일 생성 및 환경 변수 설정 완료
- [ ] SESSION_SECRET 랜덤 값으로 변경 완료
- [ ] 애플리케이션 실행 및 접속 확인 완료
- [ ] 회원가입 및 로그인 테스트 완료
- [ ] AI API 키 설정 완료 (선택사항)
- [ ] PM2 또는 systemd로 백그라운드 실행 설정 완료
- [ ] 방화벽 설정 완료

모든 항목이 체크되면 설치 완료입니다! 🎉
