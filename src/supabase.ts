import { createClient } from '@supabase/supabase-js'

// These will be your Supabase project credentials
// You'll get these from your Supabase dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types for our posts
export interface Post {
  id?: string
  title: string
  text: string
  image?: string
  x: number
  y: number
  created_at?: string
}

// Supabase database functions
export async function savePosts(posts: Post[]): Promise<void> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured. Please check SUPABASE_SETUP.md for instructions.')
    return
  }

  try {
    // Clear existing posts and insert new ones
    // Note: In a real app, you'd want more sophisticated sync logic
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all posts

    if (deleteError) {
      console.error('Error clearing posts:', deleteError)
    }

    // Insert new posts
    const { error: insertError } = await supabase
      .from('posts')
      .insert(posts.map(post => ({
        title: post.title,
        text: post.text,
        image: post.image,
        x: post.x,
        y: post.y
      })))

    if (insertError) {
      console.error('Error saving posts:', insertError)
      throw insertError
    }

    console.log('Posts saved to Supabase successfully!')
  } catch (error) {
    console.error('Failed to save posts:', error)
    throw error
  }
}

export async function loadPosts(): Promise<Post[]> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured. Please check SUPABASE_SETUP.md for instructions.')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading posts:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Failed to load posts:', error)
    return []
  }
}

export async function addPost(post: Omit<Post, 'id' | 'created_at'>): Promise<Post | null> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase not configured. Please set up your environment variables. See SUPABASE_SETUP.md for instructions.')
  }

  try {
    const { data, error } = await supabase
      .from('posts')
      .insert([{
        title: post.title,
        text: post.text,
        image: post.image,
        x: post.x,
        y: post.y
      }])
      .select()
      .single()

    if (error) {
      console.error('Error adding post:', error)
      throw error
    }

    console.log('Post added to Supabase successfully!')
    return data
  } catch (error) {
    console.error('Failed to add post:', error)
    throw error
  }
}
