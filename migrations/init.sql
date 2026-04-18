-- =========================================
-- init.sql
-- Shadow Admin CTF – Database Initialization
-- Run ONCE to initialize database memory
-- =========================================

-- =========================
-- USERS TABLE
-- =========================
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('dev', 'admin')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- SERVERS TABLE
-- =========================
CREATE TABLE servers (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,

    owner_id UUID
        REFERENCES users(id)
        ON DELETE SET NULL,

    environment TEXT NOT NULL
        CHECK (environment IN ('Dev', 'Prod')),

    status TEXT NOT NULL
        CHECK (status IN ('active', 'orphaned', 'quarantined')),

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- SERVER METADATA TABLE
-- =========================
CREATE TABLE server_metadata (
    id SERIAL PRIMARY KEY,

    server_id UUID NOT NULL
        REFERENCES servers(id)
        ON DELETE CASCADE,

    meta_key TEXT NOT NULL,
    meta_value TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE (server_id, meta_key)
);

-- =========================
-- QUARANTINE LOGS TABLE
-- =========================
CREATE TABLE quarantine_logs (
    id SERIAL PRIMARY KEY,

    server_id UUID NOT NULL
        REFERENCES servers(id)
        ON DELETE CASCADE,

    log_text TEXT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- OPTIONAL AUDIT EVENTS TABLE
-- =========================
CREATE TABLE audit_events (
    id SERIAL PRIMARY KEY,

    actor_id UUID,
    action TEXT NOT NULL,
    target_id UUID,

    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =========================
-- SEED USERS (BOOTSTRAP IDENTITIES)
-- =========================
INSERT INTO users (id, username, role)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'player', 'dev'),
    ('22222222-2222-2222-2222-222222222222', 'janitor-bot', 'admin');
    
    
-- =========================
-- DECOY PROD SERVERS (ADMIN-OWNED, UNTOUCHABLE)
-- =========================
INSERT INTO servers (id, name, owner_id, environment, status)
VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'core-prod-auth',
        NULL,
        'Prod',
        'active'
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'core-prod-backup',
        NULL,
        'Prod',
        'active'
    );

