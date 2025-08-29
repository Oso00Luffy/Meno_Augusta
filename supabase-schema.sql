-- SQL Schema for Meno Augusta Supabase Database
-- Run this in your Supabase SQL editor to set up the posts table

-- Create the posts table
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  image TEXT, -- Base64 encoded image data
  x REAL NOT NULL, -- X position on canvas
  y REAL NOT NULL, -- Y position on canvas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
-- Allow anyone to read posts
CREATE POLICY "Anyone can view posts" ON posts 
  FOR SELECT 
  USING (true);

-- Allow anyone to insert posts
CREATE POLICY "Anyone can insert posts" ON posts 
  FOR INSERT 
  WITH CHECK (true);

-- Optional: Allow anyone to update their own posts (if you add user authentication later)
-- CREATE POLICY "Users can update own posts" ON posts 
--   FOR UPDATE 
--   USING (auth.uid() = user_id);

-- Optional: Allow anyone to delete posts (be careful with this in production)
-- CREATE POLICY "Anyone can delete posts" ON posts 
--   FOR DELETE 
--   USING (true);

-- Create an index for faster queries
CREATE INDEX posts_created_at_idx ON posts (created_at DESC);

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
