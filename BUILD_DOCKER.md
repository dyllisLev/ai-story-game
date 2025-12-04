# Docker 이미지 빌드 및 배포 가이드

## 방법 1: 로컬에서 직접 빌드 (권장)

Docker가 설치된 환경에서:

```bash
# 1. Docker Hub 로그인
docker login -u dyllislev

# 2. 이미지 빌드
docker build -t dyllislev/story-cracker-ai:latest .

# 3. 이미지 푸시
docker push dyllislev/story-cracker-ai:latest

# 4. 특정 버전 태그도 추가 (선택사항)
docker tag dyllislev/story-cracker-ai:latest dyllislev/story-cracker-ai:v1.0.0
docker push dyllislev/story-cracker-ai:v1.0.0
```

## 방법 2: GitHub Actions 자동 빌드 (추천)

1. **GitHub 저장소 생성 및 코드 푸시**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/story-cracker-ai.git
   git push -u origin main
   ```

2. **GitHub Secrets 설정**
   - GitHub 저장소 → Settings → Secrets and variables → Actions
   - New repository secret 클릭
   - 다음 secrets 추가:
     - `DOCKER_USERNAME`: dyllislev
     - `DOCKER_PASSWORD`: Docker Hub 액세스 토큰

3. **자동 빌드 트리거**
   - main 브랜치에 푸시하면 자동으로 빌드 시작
   - 또는 Actions 탭에서 수동 실행 (Run workflow)

## 방법 3: Docker Compose 사용

```bash
# 빌드 및 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

## 이미지 사용 방법

### Docker Run
```bash
docker run -d \
  --name story-cracker-ai \
  -p 5000:5000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/data:/app/data \
  -e SESSION_SECRET=your-secret-key \
  dyllislev/story-cracker-ai:latest
```

### Docker Compose (권장)
```bash
# docker-compose.yml 파일 사용
docker-compose up -d
```

## 환경 변수

필요한 환경 변수들:

- `NODE_ENV`: production (기본값)
- `PORT`: 5000 (기본값)
- `SESSION_SECRET`: 세션 암호화 키 (필수)
- API 키들은 사용자가 계정 설정에서 입력

## 헬스체크

```bash
curl http://localhost:5000/api/health
```

응답: `{"status":"ok","timestamp":"2024-12-04T..."}`

## 데이터 영속성

- **uploads/**: 사용자 업로드 이미지
- **data/**: SQLite 데이터베이스 파일

볼륨 마운트를 통해 데이터를 보존하세요:
```bash
-v ./uploads:/app/uploads
-v ./data:/app/data
```

## 멀티 플랫폼 빌드

ARM64와 AMD64 모두 지원:

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t dyllislev/story-cracker-ai:latest \
  --push .
```

## 트러블슈팅

### 포트 충돌
```bash
# 다른 포트 사용
docker run -p 8080:5000 dyllislev/story-cracker-ai:latest
```

### 로그 확인
```bash
docker logs story-cracker-ai
```

### 컨테이너 재시작
```bash
docker restart story-cracker-ai
```
