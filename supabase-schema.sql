-- SQL Schema for Meno Augusta Supabase Database
-- Run this in your Supabase SQL editor for a fresh Supabase project

-- Required for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_username TEXT NOT NULL DEFAULT '',
  owner_color TEXT NOT NULL DEFAULT '#d4af37',
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  image TEXT, -- Base64 encoded image data
  x REAL NOT NULL, -- X position on canvas
  y REAL NOT NULL, -- Y position on canvas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Migration for existing old projects (safe to run multiple times)
-- Must run before policies because policies reference owner_id.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE posts
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS owner_username TEXT NOT NULL DEFAULT '';

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS owner_color TEXT NOT NULL DEFAULT '#d4af37';

-- Create policies for public access
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Anyone can insert posts" ON posts;
DROP POLICY IF EXISTS "Anyone can update posts" ON posts;
DROP POLICY IF EXISTS "Anyone can delete posts" ON posts;

-- Allow anyone to read posts
CREATE POLICY "Anyone can view posts" ON posts 
  FOR SELECT 
  USING (true);

-- Allow signed-in users to insert posts that belong to them
CREATE POLICY "Anyone can insert posts" ON posts 
  FOR INSERT 
  WITH CHECK (auth.uid() = owner_id);

-- Allow users to update only their own posts
CREATE POLICY "Anyone can update posts" ON posts 
  FOR UPDATE 
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Allow users to delete only their own posts
CREATE POLICY "Anyone can delete posts" ON posts 
  FOR DELETE 
  USING (auth.uid() = owner_id);

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);

-- Optional: Add a function to clean up old posts (to prevent infinite growth)
-- This function will keep only the latest 1000 posts
CREATE OR REPLACE FUNCTION cleanup_old_posts()
RETURNS void AS $$
BEGIN
  DELETE FROM posts 
  WHERE id NOT IN (
    SELECT id FROM posts 
    ORDER BY created_at DESC 
    LIMIT 1000
  );
END;
$$ LANGUAGE plpgsql;

-- Optional: Schedule the cleanup function to run daily
-- (You would set this up in the Supabase dashboard under Database > Cron Jobs)
-- SELECT cron.schedule('cleanup-posts', '0 2 * * *', 'SELECT cleanup_old_posts();');
