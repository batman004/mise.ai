-- Database initialization script for Mise AI platform
-- This script creates the necessary tables for the application

-- Create prediction_results table
CREATE TABLE IF NOT EXISTS prediction_results (
    id SERIAL PRIMARY KEY,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    prediction_data JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on job_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_prediction_results_job_id ON prediction_results(job_id);

-- Create index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_prediction_results_user_id ON prediction_results(user_id);

-- Create index on status for filtering by status
CREATE INDEX IF NOT EXISTS idx_prediction_results_status ON prediction_results(status);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_prediction_results_created_at ON prediction_results(created_at);

-- Create files_meta table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS files_meta (
    id SERIAL PRIMARY KEY,
    file_hash VARCHAR(255) UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id VARCHAR(255),
    processed BOOLEAN DEFAULT FALSE
);

-- Create index on file_hash for faster lookups
CREATE INDEX IF NOT EXISTS idx_files_meta_file_hash ON files_meta(file_hash);

-- Create index on user_id for user-specific queries
CREATE INDEX IF NOT EXISTS idx_files_meta_user_id ON files_meta(user_id);

-- Create users table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Create index on email for authentication
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Insert default admin user (optional)
INSERT INTO users (user_id, email)
VALUES ('admin', 'admin@mise.ai')
ON CONFLICT (user_id) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_prediction_results_updated_at
    BEFORE UPDATE ON prediction_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to mise_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mise_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO mise_user;
GRANT USAGE ON SCHEMA public TO mise_user;
