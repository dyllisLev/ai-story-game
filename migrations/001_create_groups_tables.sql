-- 그룹 권한 시스템 마이그레이션
-- 데이터베이스 연결이 복구되면 이 SQL을 실행하세요

-- 그룹 테이블 생성
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('user', 'admin')),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 사용자-그룹 연결 테이블
CREATE TABLE IF NOT EXISTS user_groups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- 스토리-그룹 권한 테이블
CREATE TABLE IF NOT EXISTS story_groups (
  id SERIAL PRIMARY KEY,
  story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'write')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(story_id, group_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_id ON user_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_story_groups_story_id ON story_groups(story_id);
CREATE INDEX IF NOT EXISTS idx_story_groups_group_id ON story_groups(group_id);

-- 기본 그룹 생성
INSERT INTO groups (name, type, description) VALUES 
  ('사용자', 'user', '일반 사용자 그룹'),
  ('관리자', 'admin', '관리자 그룹')
ON CONFLICT (name) DO NOTHING;

-- 완료 메시지
SELECT '그룹 권한 시스템 마이그레이션 완료' AS status;
