-- Add down migration script here
ALTER TABLE user_profile ADD COLUMN github_link TEXT NULL;