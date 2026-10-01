-- =======================================================================
-- PostgreSQL 16 Relational Schema for Real-time Facial Recognition
-- and Crowd Dynamics in Public Spaces
-- =======================================================================

CREATE TABLE IF NOT EXISTS cameras (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    rtsp_url VARCHAR(256),
    zone VARCHAR(128) DEFAULT 'Concourse Main',
    resolution VARCHAR(32) DEFAULT '1920x1080',
    fps DOUBLE PRECISION DEFAULT 30.0,
    status VARCHAR(32) DEFAULT 'ONLINE',
    tripwire_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrolled_faces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    role VARCHAR(64) DEFAULT 'Staff',
    status VARCHAR(32) DEFAULT 'REGISTERED',
    embedding_json TEXT NOT NULL,
    face_crop_url TEXT,
    notes TEXT,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracked_persons (
    id VARCHAR(64) PRIMARY KEY,
    cluster_id VARCHAR(32) NOT NULL,
    label VARCHAR(128) NOT NULL,
    match_confidence DOUBLE PRECISION DEFAULT 0.0,
    status VARCHAR(32) DEFAULT 'UNREGISTERED',
    camera_id VARCHAR(64) REFERENCES cameras(id) ON DELETE CASCADE,
    x DOUBLE PRECISION DEFAULT 50.0,
    y DOUBLE PRECISION DEFAULT 50.0,
    vx DOUBLE PRECISION DEFAULT 0.0,
    vy DOUBLE PRECISION DEFAULT 0.0,
    speed DOUBLE PRECISION DEFAULT 0.0,
    direction_deg DOUBLE PRECISION DEFAULT 0.0,
    occlusion_percent DOUBLE PRECISION DEFAULT 0.0,
    occlusion_type VARCHAR(32) DEFAULT 'NONE',
    risk_score DOUBLE PRECISION DEFAULT 0.0,
    is_flagged_suspicious BOOLEAN DEFAULT FALSE,
    flag_reason VARCHAR(256),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cross_camera_handovers (
    id SERIAL PRIMARY KEY,
    person_cluster_id VARCHAR(32) NOT NULL,
    from_camera_id VARCHAR(64) NOT NULL,
    to_camera_id VARCHAR(64) NOT NULL,
    confidence DOUBLE PRECISION DEFAULT 0.85,
    handover_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_alerts (
    id VARCHAR(64) PRIMARY KEY,
    camera_id VARCHAR(64) REFERENCES cameras(id) ON DELETE CASCADE,
    camera_name VARCHAR(128) DEFAULT 'Transit Cam',
    type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) DEFAULT 'WARNING',
    title VARCHAR(256) NOT NULL,
    description TEXT NOT NULL,
    person_cluster_id VARCHAR(32),
    confidence DOUBLE PRECISION DEFAULT 0.90,
    status VARCHAR(32) DEFAULT 'ACTIVE',
    metrics_json TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crowd_metrics (
    id SERIAL PRIMARY KEY,
    camera_id VARCHAR(64) REFERENCES cameras(id) ON DELETE CASCADE,
    headcount INTEGER DEFAULT 0,
    density_index DOUBLE PRECISION DEFAULT 0.0,
    turbulence_index DOUBLE PRECISION DEFAULT 0.0,
    flow_angle_deg DOUBLE PRECISION DEFAULT 0.0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for low-latency queries and Re-ID cluster searches
CREATE INDEX IF NOT EXISTS idx_tracked_cluster_id ON tracked_persons(cluster_id);
CREATE INDEX IF NOT EXISTS idx_tracked_camera_id ON tracked_persons(camera_id);
CREATE INDEX IF NOT EXISTS idx_handover_cluster ON cross_camera_handovers(person_cluster_id);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON security_alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded ON crowd_metrics(recorded_at DESC);

-- Seed Initial Cameras
INSERT INTO cameras (id, name, zone, resolution, fps, status, tripwire_enabled)
VALUES 
    ('CAM-01', 'North Gate Concourse', 'Entry Zone A', '1920x1080 30FPS', 30.0, 'ONLINE', true),
    ('CAM-02', 'Central Transit Junction', 'Main Corridor B', '1920x1080 30FPS', 30.0, 'ONLINE', true),
    ('CAM-03', 'Security Checkpoint Bravo', 'Screening Area C', '1280x720 30FPS', 30.0, 'ONLINE', true),
    ('CAM-04', 'South Platform Egress', 'Platform Exit Gates D', '1920x1080 30FPS', 30.0, 'ONLINE', true)
ON CONFLICT (id) DO NOTHING;
