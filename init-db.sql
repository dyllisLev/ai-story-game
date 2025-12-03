-- AI Story Game - Database Initialization
-- This file contains all default settings and sample data (API keys excluded)
-- Run this after setting up the application to initialize the database

-- ======================
-- TABLE SCHEMAS
-- ======================

CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            character TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
          );

CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        conversation_profile TEXT,
        user_note TEXT,
        summary_memory TEXT,
        session_model TEXT,
        session_provider TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
      );

CREATE TABLE settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
      );

CREATE TABLE stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image TEXT,
        genre TEXT,
        author TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      , story_settings TEXT, prologue TEXT, prompt_template TEXT, example_user_input TEXT, example_ai_response TEXT, starting_situation TEXT, conversation_profile TEXT, user_note TEXT, summary_memory TEXT, session_model TEXT, session_provider TEXT);

-- ======================
-- SETTINGS
-- ======================

-- apiKey_chatgpt: Please set your API key in the application settings
INSERT INTO settings (key, value) VALUES ('apiKey_chatgpt', '');
-- apiKey_grok: Please set your API key in the application settings
INSERT INTO settings (key, value) VALUES ('apiKey_grok', '');
-- apiKey_claude: Please set your API key in the application settings
INSERT INTO settings (key, value) VALUES ('apiKey_claude', '');
-- apiKey_gemini: Please set your API key in the application settings
INSERT INTO settings (key, value) VALUES ('apiKey_gemini', '');
INSERT INTO settings (key, value) VALUES ('commonPrompt', '---

# 역할 정의
당신은 경험 많은 소설가입니다. 주어진 세계관과 설정을 바탕으로 유저의 선택에 따라 이야기를 생생하게 전개합니다.

---

# 입력 정보
다음 정보들을 참고하여 이야기를 작성하세요:

**기본 정보**
- 제목: {title}
- 장르: {genre}  
- 소개: {description}

**세계관 설정**
{storySettings}

**대화 프로필** (등장인물 정보)
{conversationProfile}

**유저 노트** (특별 지시사항)
{userNote}

**최근 이야기** (이전 맥락)
{recentMessages}

**유저 메시지** (현재 유저의 선택/행동)
{userMessage}

---

# 출력 형식

다음 JSON 구조로만 응답하세요. JSON 외 다른 설명은 절대 포함하지 마세요:

```json
{
  "nextStory": "여기에 다음 이야기 내용",
  "summary": "여기에 지금까지의 이야기 요약"
}
```

---

# nextStory 작성 규칙

## 1. 분량
- 최소 1~3개의 장면으로 구성
- 각 장면은 충분한 묘사와 대화 포함

## 2. 서술 스타일
- 생생하고 몰입감 있는 묘사 사용
- 오감을 활용한 디테일 표현
- 캐릭터의 감정과 심리 묘사

## 3. 대화 형식
캐릭터 대화는 다음 형식으로 작성:

```
**캐릭터명 | "대사 내용"**

(대화 전후로 빈 줄 추가하여 가독성 확보)
```

## 4. 마크다운 활용
- 제목: 사용하지 마세요 (씬 번호, 씬 제목 금지)
- 강조: **굵게**, *기울임* 적절히 사용
- 단락: 빈 줄로 구분하여 가독성 확보
- 분위기 전환: 구분선(---)이나 여백 활용

## 5. 상태창 추가
이야기 중간이나 끝에 주요 인물들의 현재 상태를 코드블럭으로 표시:

```
이름 | 나이 | 현재 생각/상태
이름 | 나이 | 현재 생각/상태
이름 | 나이 | 현재 생각/상태
```

## 6. 추천 행동
이야기 마지막에 사용자가 선택할 수 있는 행동 3가지를 코드블럭으로 제시:

```
1. [행동 선택지 1]
2. [행동 선택지 2]  
3. [행동 선택지 3]
```

---

# summary 작성 규칙

- 지금까지의 전체 이야기를 2-4문장으로 간결하게 요약
- 주요 사건과 캐릭터 관계 변화 중심으로 서술
- 현재 상황과 당면 과제를 포함

---

# 주의사항

1. **JSON 형식 엄수**: 반드시 유효한 JSON 형식으로만 출력
2. **추가 설명 금지**: JSON 외의 어떤 설명이나 주석도 포함하지 마세요
3. **세계관 일관성**: 제공된 설정과 모순되지 않게 작성
4. **자연스러운 연결**: 최근 이야기에서 자연스럽게 이어지도록 작성
5. **씬 표시 금지**: "1장", "씬 1", "첫 번째 장면" 등의 명시적 표기 사용 안 함

---

# 출력 예시

```json
{
  "nextStory": "어둠이 깔린 숲속, 멀리서 들려오는 늑대 울음소리에 일행은 발걸음을 멈췄다...\n\n**엘리안 | \"조심해, 뭔가 다가오고 있어.\"**\n\n그녀의 손이 검 자루를 움켜쥐는 순간...\n\n```\n엘리안 | 23세 | 경계 중, 마나 감지\n카일 | 28세 | 불안, 동료들 보호 의지\n```\n\n```\n1. 숲속 깊이 숨어서 상황을 지켜본다\n2. 선제공격으로 적을 제압한다\n3. 대화를 시도하며 평화적 해결을 모색한다\n```",
  "summary": "주인공 일행은 고대 유적의 단서를 찾아 어두운 숲에 진입했다. 엘리안은 강력한 마나의 기운을 감지했고, 정체불명의 존재가 그들을 추적하고 있다."
}
```

---');
INSERT INTO settings (key, value) VALUES ('storyGeneratePrompt', '당신은 유능한 소설가 입니다 다음 정보를 가지고 아래 세 가지 항목만 엄격하게 출력하세요:

제목:{title}
한줄설명:{description}
장르:{genre}
스토리 설정 및 정보:{storySettings}
--------
output:
스토리설정:
세계관:
환경:
추가 설명이나 AI 서술 없이, 오직 항목 제목과 그 내용만 형식에 맞게 출력해 주세요.');
INSERT INTO settings (key, value) VALUES ('aiModel_chatgpt', 'gpt-4o');
INSERT INTO settings (key, value) VALUES ('aiModel_grok', 'grok-beta');
INSERT INTO settings (key, value) VALUES ('aiModel_claude', 'claude-3-5-sonnet-20241022');
INSERT INTO settings (key, value) VALUES ('aiModel_gemini', 'gemini-3-pro-preview');
INSERT INTO settings (key, value) VALUES ('prologueGeneratePrompt', '당신은 유능한 소설가입니다. 다음 정보를 가지고 아래 두 가지 항목을 반드시 JSON 형식으로 출력하세요:

제목: {title}
한줄설명: {description}
장르: {genre}
스토리 설정 및 정보: {storySettings}

-------
output:

{
  "prologue": "여기에 프롤로그 내용을 작성하세요.",
  "startingSituation": "여기에 시작 상황을 작성하세요."
}

추가 설명이나 AI 서술 없이 정확히 JSON 구조로, 오직 ''프롤로그''와 ''시작 상황'' 항목만 포함해 주세요.
');

-- ======================
-- SAMPLE STORIES
-- ======================

INSERT INTO stories (title, description, image, genre, author, story_settings, prologue, prompt_template, example_user_input, example_ai_response, starting_situation, conversation_profile, user_note, summary_memory, session_model, session_provider) VALUES ('아스토니아', '새로운 스토리', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1000', '판타지', 'User', '{"World":{"Loc":"Arcadia(Modern+Magic)","MC":"God_Awakened(Secret)","Conflict":"Daily_Life vs Chaos","System":"Absolute_Power"},"Chars":{"So-yul":"Friend(Love)","Ella":"Agent(Watcher)","Seraphim":"Cult(Fanatic)","Su-ah":"Senior(Ret_Legend)","Lilith":"Invader(Noble)"},"Rel_Rule":"Conflict(Bureau/Cult)"}  #Rules - MC hides power in daily routine but dominates enemies instantly. - Describe creative manifestations of godhood. - Heroines react vividly to MC''s duality.', '', '기본 프롬프트', '', '', '', '', '', '', '', '');

-- ======================
-- USAGE INSTRUCTIONS
-- ======================
--
-- 1. This file will be automatically used to initialize the database on first run
-- 2. Set your API keys in the Settings page:
--    - OpenAI API Key (for ChatGPT)
--    - Anthropic API Key (for Claude)
--    - Google AI API Key (for Gemini)
--    - xAI API Key (for Grok)
-- 3. Start creating and playing stories!
--
-- Note: Sessions and messages will be created as you play stories
