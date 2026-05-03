-- 1. users
CREATE TABLE IF NOT EXISTS users (
    user_id BIGSERIAL PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. social_accounts
CREATE TABLE IF NOT EXISTS social_accounts (
    provider VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(100) NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_social_user ON social_accounts(user_id);

-- 3. friendships
CREATE TABLE IF NOT EXISTS friendships (
    requester_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    PRIMARY KEY (requester_id, receiver_id),
    CHECK (requester_id != receiver_id)
);
CREATE INDEX IF NOT EXISTS idx_friendships_receiver ON friendships(receiver_id);

-- 4. running_rooms
CREATE TABLE IF NOT EXISTS running_rooms (
    room_id BIGSERIAL PRIMARY KEY,
    host_user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    room_name VARCHAR(100) NOT NULL,
    room_password CHAR(4) DEFAULT NULL CHECK (room_password IS NULL OR LENGTH(room_password) = 4),
    max_participants INT DEFAULT 10 CHECK (max_participants >= 2 AND max_participants <= 10),
    description VARCHAR(200) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_rooms_host ON running_rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON running_rooms(is_deleted);

-- 5. room_participants
CREATE TABLE IF NOT EXISTS room_participants (
    room_id BIGINT NOT NULL REFERENCES running_rooms(room_id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);

-- 6. running_records
CREATE TABLE IF NOT EXISTS running_records (
    record_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    room_id BIGINT DEFAULT NULL REFERENCES running_rooms(room_id),

    total_distance_m INT NOT NULL,
    duration_seconds INT NOT NULL,

    avg_pace_seconds INT DEFAULT NULL,
    avg_speed_kmh DECIMAL(4,1) DEFAULT NULL,
    avg_heart_rate INT DEFAULT NULL,
    calories INT DEFAULT NULL,

    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NOT NULL,

    UNIQUE (user_id, started_at)
);
CREATE INDEX IF NOT EXISTS idx_records_user ON running_records(user_id);
CREATE INDEX IF NOT EXISTS idx_records_room ON running_records(room_id);

-- 7. location_logs
CREATE TABLE IF NOT EXISTS location_logs (
    record_id BIGINT NOT NULL REFERENCES running_records(record_id) ON DELETE CASCADE,
    seq INT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (record_id, seq)
);
