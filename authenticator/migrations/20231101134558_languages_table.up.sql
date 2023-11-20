-- Add up migration script here
CREATE TABLE IF NOT EXISTS languages(
    "uuid" UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(50) NOT NULL,
    "local_name" VARCHAR(50) NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "short_code" VARCHAR(2) NOT NULL,
    "description" TEXT NOT NULL
);