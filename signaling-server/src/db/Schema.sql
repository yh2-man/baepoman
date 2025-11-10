-- 사용자 정보 테이블
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,                 -- 사용자 고유 ID (자동 증가)
    username VARCHAR(50) NOT NULL,         -- 사용자 닉네임
    tag VARCHAR(4) NOT NULL,               -- 사용자 고유 태그 (예: #0001)
    email VARCHAR(255) UNIQUE NOT NULL,    -- 사용자 이메일 (고유해야 하며 필수, 로그인 ID 역할)
    password_hash VARCHAR(255) NOT NULL,   -- 비밀번호 해시 값 (보안을 위해 암호화된 형태)
    profile_image_url VARCHAR(255),        -- 프로필 이미지 URL (선택 사항)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 계정 생성 일시
    last_seen_at TIMESTAMPTZ,              -- 마지막 접속 일시 (선택 사항, 온라인 상태 표시 등에 활용)
    UNIQUE (username, tag)                 -- 닉네임과 태그 조합은 고유해야 함
);

-- 이메일 인증을 위한 임시 테이블
CREATE TABLE IF NOT EXISTS pending_verifications (
    email VARCHAR(255) PRIMARY KEY,        -- 인증 대기 중인 이메일 주소 (기본 키, 고유)
    username VARCHAR(50) NOT NULL,         -- 사용자가 신청한 닉네임
    password_hash VARCHAR(255) NOT NULL,   -- 사용자가 신청한 비밀번호의 해시 값
    code VARCHAR(6) NOT NULL,              -- 이메일로 전송된 6자리 인증 코드
    expires_at TIMESTAMPTZ NOT NULL,       -- 인증 코드의 만료 시간
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- 인증 요청 생성 일시
);

-- 카테고리 정보 테이블
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,                -- 카테고리 고유 ID (자동 증가)
    name VARCHAR(50) UNIQUE NOT NULL,     -- 카테고리 이름 (예: 게임, 스터디, 잡담)
    image_url VARCHAR(255)                -- 카테고리 대표 이미지 URL
);

-- 통화방 정보 테이블
CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100), -- 1:1 채팅방은 이름이 NULL일 수 있음
    room_type VARCHAR(20) NOT NULL DEFAULT 'group', -- 'group' 또는 'dm' (Direct Message)
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, -- 카테고리 ID (categories 테이블 참조)
    host_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- 방장 사용자 ID (users 테이블 참조)
    max_participants INTEGER NOT NULL DEFAULT 8, -- 최대 참가자 수 (기본값 8명)
    is_private BOOLEAN NOT NULL DEFAULT FALSE, -- 비공개 방 여부 (기본값 공개)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 방 생성 일시
    closed_at TIMESTAMPTZ                  -- 방 종료 일시 (방이 닫혔을 경우 기록)
);

-- 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,              -- 메시지 고유 ID (자동 증가, 많은 메시지에 대비)
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, -- 메시지가 속한 방 ID (rooms 테이블 참조)
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 메시지를 보낸 사용자 ID (users 테이블 참조)
    content TEXT NOT NULL,                 -- 메시지 내용
    is_edited BOOLEAN NOT NULL DEFAULT FALSE, -- 메시지 수정 여부 (수정되었으면 TRUE)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 메시지 전송 일시
    updated_at TIMESTAMPTZ,                        -- 메시지 수정 일시 (수정되었을 경우 기록)
    deleted_at TIMESTAMPTZ                 -- 메시지 삭제 일시 (소프트 삭제 시 기록)
);

-- 채팅 메시지 수정 내역 테이블
CREATE TABLE IF NOT EXISTS chat_edit_history (
    id SERIAL PRIMARY KEY,                 -- 수정 이력 고유 ID (자동 증가)
    chat_message_id BIGINT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE, -- 수정된 원본 메시지의 ID
    old_content TEXT NOT NULL,             -- 수정되기 전의 메시지 내용
    edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- 메시지가 수정된 일시
);

-- 친구 관계 테이블
CREATE TABLE IF NOT EXISTS friendships (
    user_id_1 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 친구 관계의 첫 번째 사용자 ID
    user_id_2 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 친구 관계의 두 번째 사용자 ID
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')), -- 친구 관계의 현재 상태
    requested_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 친구 요청을 보낸 사용자 ID
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 친구 관계 생성 일시
    updated_at TIMESTAMPTZ,                        -- 친구 관계 상태 변경 일시
    PRIMARY KEY (user_id_1, user_id_2)             -- 두 사용자 ID의 조합으로 기본 키 설정
);

-- 방 단위 차단 정보 테이블
CREATE TABLE IF NOT EXISTS room_bans (
    id SERIAL PRIMARY KEY,                 -- 차단 기록 고유 ID (자동 증가)
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, -- 차단이 발생한 방 ID (rooms 테이블 참조)
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 차단된 사용자 ID (users 테이블 참조)
    banned_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 차단을 실행한 방장 사용자 ID (users 테이블 참조)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- 차단 기록 생성 일시
);

-- STT (Speech-to-Text) 변환 기록 테이블
CREATE TABLE IF NOT EXISTS stt_transcriptions (
    id SERIAL PRIMARY KEY,                 -- STT 기록 고유 ID (자동 증가)
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE, -- STT가 발생한 방 ID
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 음성을 발화한 사용자 ID
    transcribed_text TEXT NOT NULL,        -- 변환된 텍스트 내용
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- 변환 기록 생성 일시
);

-- 1:1 다이렉트 메시지 테이블
CREATE TABLE IF NOT EXISTS direct_messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
