# Supabase 설정 가이드

## 1. Supabase에 스키마 생성

1. Supabase Dashboard 접속: https://supa.nuc.hmini.me
2. SQL Editor로 이동 (왼쪽 사이드바)
3. `supabase-schema.sql` 파일의 내용을 복사
4. SQL Editor에 붙여넣기
5. **Run** 버튼 클릭하여 실행

## 2. 환경 변수 확인

Replit Secrets에 다음 환경 변수가 설정되어 있는지 확인:

```env
SUPABASE_URL=https://supa.nuc.hmini.me
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzM5ODA0NDAwLAogICJleHAiOiAxODk3NTcwODAwCn0.AFXH3OIGsCoWsWF9XVQLtN90OLC9g-_AjoeIfxVPfeE
```

## 3. 테이블 구조

### users
- 사용자 계정 정보
- API 키 및 모델 선택사항 저장
- Conversation Profile 저장 (JSON)

### stories
- 스토리 템플릿
- 프롤로그, 설정, 예시 등

### sessions  
- 각 스토리의 플레이스루
- 사용자별 세션 관리

### messages
- 세션별 대화 기록
- 사용자 입력과 AI 응답

### settings
- 전역 설정 (시스템 프롬프트 등)

## 4. Row Level Security (RLS)

모든 테이블에 RLS가 활성화되어 있지만, 서버 측에서 Supabase Anon Key로 모든 작업을 수행하므로 정책이 모든 접근을 허용합니다.

향후 Supabase Auth를 사용할 경우 정책을 업데이트할 수 있습니다.

## 5. 인덱스

성능 최적화를 위한 인덱스:
- sessions: story_id, user_id
- messages: session_id
- users: username, email

## 6. 데이터 마이그레이션

기존 SQLite 데이터를 Supabase로 이전하려면:

1. SQLite에서 데이터 내보내기
2. Supabase SQL Editor에서 INSERT 문 실행
3. 또는 애플리케이션에서 스크립트 작성

## 7. 백업

Supabase는 자동 백업을 제공합니다:
- Settings > Database > Backups

## 8. 연결 테스트

애플리케이션 실행 후 로그 확인:
```
✓ Supabase client initialized
```

## 트러블슈팅

### 연결 오류
- SUPABASE_URL이 정확한지 확인
- SUPABASE_ANON_KEY가 유효한지 확인
- Self-hosted Supabase가 실행 중인지 확인

### RLS 오류  
- 정책이 올바르게 설정되었는지 확인
- Anon key로 접근 가능한지 테스트

### 테이블 생성 실패
- 기존 테이블이 있는지 확인
- DROP TABLE 후 재생성 시도
