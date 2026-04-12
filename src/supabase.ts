import { createClient } from '@supabase/supabase-js'

// These will be your Supabase project credentials
// You'll get these from your Supabase dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY'
const LS_KEY = 'meno-augusta.posts.v2'
const memoryPosts = new Map<string, Post>()
const LOCAL_STORAGE_BYTE_LIMIT = 2.5 * 1024 * 1024

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

export interface AddPostResult {
  post: Post
  savedToCloud: boolean
  fallbackReason?: string
}

export interface UpdatePostResult {
  post: Post
  savedToCloud: boolean
  fallbackReason?: string
}

export interface DeletePostResult {
  deletedPostId: string
  savedToCloud: boolean
  fallbackReason?: string
}

function extractSupabaseErrorReason(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>
    const message = typeof errorObj.message === 'string' ? errorObj.message : ''
    const details = typeof errorObj.details === 'string' ? errorObj.details : ''
    const hint = typeof errorObj.hint === 'string' ? errorObj.hint : ''
    const code = typeof errorObj.code === 'string' ? errorObj.code : ''
    const status = typeof errorObj.status === 'number' ? `status=${errorObj.status}` : ''

    const parts = [message, details, hint, code, status].filter(Boolean)
    if (parts.length > 0) {
      return parts.join(' | ')
    }

    try {
      return JSON.stringify(errorObj)
    } catch {
      return 'Supabase returned an unknown object error'
    }
  }

  return 'Unknown Supabase error'
}

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__meno_augusta_ls_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

function loadLocalPosts(): Post[] {
  if (!isLocalStorageAvailable()) {
    return Array.from(memoryPosts.values())
  }

  try {
    const data = localStorage.getItem(LS_KEY)
    if (!data) {
      return Array.from(memoryPosts.values())
    }

    const parsed = JSON.parse(data)
    if (!Array.isArray(parsed)) {
      console.warn('Local post cache is invalid, resetting it.')
      return Array.from(memoryPosts.values())
    }

    return parsed as Post[]
  } catch (error) {
    console.error('Failed to load local posts:', error)
    return Array.from(memoryPosts.values())
  }
}

function saveLocalPosts(posts: Post[]): void {
  if (!isLocalStorageAvailable()) {
    memoryPosts.clear()
    for (const post of posts) {
      if (post.id) {
        memoryPosts.set(post.id, post)
      }
    }
    return
  }

  try {
    const attempts = [
      posts,
      posts.slice(-100).map((post, index) => index < 20 ? post : { ...post, image: undefined }),
      posts.slice(-50).map((post, index) => index < 10 ? post : { ...post, image: undefined }),
      posts.slice(-20).map(post => ({ ...post, image: undefined })),
      posts.slice(-5).map(post => ({ ...post, image: undefined })),
      posts.slice(-1).map(post => ({ ...post, image: undefined })),
    ]

    for (const candidatePosts of attempts) {
      const serialized = JSON.stringify(candidatePosts)

      if (serialized.length > LOCAL_STORAGE_BYTE_LIMIT) {
        continue
      }

      try {
        localStorage.setItem(LS_KEY, serialized)
        return
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'QuotaExceededError') {
          throw error
        }
      }
    }

    memoryPosts.clear()
    for (const post of posts.slice(-1)) {
      if (post.id) {
        memoryPosts.set(post.id, post)
      }
    }
  } catch (error) {
    console.error('Failed to save local posts:', error)

    if (error instanceof Error && error.name === 'QuotaExceededError') {
      memoryPosts.clear()
      for (const post of posts.slice(-1)) {
        if (post.id) {
          memoryPosts.set(post.id, post)
        }
      }
    }
  }
}

function createLocalPost(post: Omit<Post, 'id' | 'created_at'>): Post {
  const savedPostId = crypto.randomUUID()
  const savedPost: Post = {
    ...post,
    id: savedPostId,
    created_at: new Date().toISOString(),
  }

  const posts = loadLocalPosts()
  posts.unshift(savedPost)
  try {
    saveLocalPosts(posts)
  } catch (error) {
    console.error('Unable to persist local post, keeping it in memory only:', error)
    memoryPosts.set(savedPostId, savedPost)
  }

  return savedPost
}

function syncLocalPosts(posts: Post[]): void {
  saveLocalPosts(posts)
}

function updateLocalPost(postId: string, updates: Partial<Omit<Post, 'id' | 'created_at'>>): Post | null {
  const posts = loadLocalPosts()
  const index = posts.findIndex(post => post.id === postId)

  if (index === -1) {
    return null
  }

  const existingPost = posts[index]
  const updatedPost: Post = {
    ...existingPost,
    ...updates,
    id: existingPost.id,
    created_at: existingPost.created_at,
  }

  posts[index] = updatedPost
  saveLocalPosts(posts)
  return updatedPost
}

function deleteLocalPost(postId: string): boolean {
  const posts = loadLocalPosts()
  const filteredPosts = posts.filter(post => post.id !== postId)

  if (filteredPosts.length === posts.length) {
    return false
  }

  saveLocalPosts(filteredPosts)
  return true
}

// Supabase database functions
export async function savePosts(posts: Post[]): Promise<void> {
  if (!isSupabaseConfigured) {
    syncLocalPosts(posts)
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
    syncLocalPosts(posts)
    throw error
  }
}

export async function loadPosts(): Promise<Post[]> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is unavailable. Falling back to local storage.')
    return loadLocalPosts().sort((a, b) => {
      const left = new Date(b.created_at ?? 0).getTime()
      const right = new Date(a.created_at ?? 0).getTime()
      return left - right
    })
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
    return loadLocalPosts()
  }
}

export async function addPost(post: Omit<Post, 'id' | 'created_at'>): Promise<AddPostResult> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is unavailable. Saving post locally instead.')
    return {
      post: createLocalPost(post),
      savedToCloud: false,
      fallbackReason: 'Supabase is not configured.',
    }
  }

  try {
    const savedPost: Post = {
      ...post,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([savedPost])
      .select('id')

    if (error) {
      console.error('Error adding post:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.warn('Post inserted but no row was returned. Using client-generated record.')
    }

    console.log('Post added to Supabase successfully!')
    return {
      post: savedPost,
      savedToCloud: true,
    }
  } catch (error) {
    console.error('Failed to add post:', error)
    const reason = extractSupabaseErrorReason(error)
    return {
      post: createLocalPost(post),
      savedToCloud: false,
      fallbackReason: reason,
    }
  }
}

export async function updatePost(
  postId: string,
  updates: Partial<Omit<Post, 'id' | 'created_at'>>,
  existingPost?: Post
): Promise<UpdatePostResult> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is unavailable. Updating post locally instead.')

    const updatedPost = updateLocalPost(postId, updates)
    if (!updatedPost) {
      throw new Error('Post not found')
    }

    return {
      post: updatedPost,
      savedToCloud: false,
      fallbackReason: 'Supabase is not configured.',
    }
  }

  try {
    const { data, error } = await supabase
      .from('posts')
      .update({
        title: updates.title,
        text: updates.text,
        image: updates.image,
        x: updates.x,
        y: updates.y,
      })
      .eq('id', postId)
      .select('id')

    if (error) {
      console.error('Error updating post:', error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('No rows were updated on Supabase. Check UPDATE policies and row visibility.')
    }

    console.log('Post updated in Supabase successfully!')
    return {
      post: existingPost
        ? {
            ...existingPost,
            ...updates,
            id: existingPost.id,
            created_at: existingPost.created_at,
          }
        : {
            id: postId,
            title: updates.title ?? '',
            text: updates.text ?? '',
            image: updates.image,
            x: updates.x ?? 0,
            y: updates.y ?? 0,
          },
      savedToCloud: true,
    }
  } catch (error) {
    console.error('Failed to update post:', error)
    if (!isSupabaseConfigured) {
      const updatedPost = updateLocalPost(postId, updates)

      if (!updatedPost) {
        throw error instanceof Error ? error : new Error('Post not found')
      }

      return {
        post: updatedPost,
        savedToCloud: false,
        fallbackReason: 'Supabase is not configured.',
      }
    }

    throw error instanceof Error ? error : new Error(extractSupabaseErrorReason(error))
  }
}

export async function deletePost(postId: string): Promise<DeletePostResult> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is unavailable. Deleting post locally instead.')

    const deleted = deleteLocalPost(postId)
    if (!deleted) {
      throw new Error('Post not found')
    }

    return {
      deletedPostId: postId,
      savedToCloud: false,
      fallbackReason: 'Supabase is not configured.',
    }
  }

  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)

    if (error) {
      console.error('Error deleting post:', error)
      throw error
    }

    console.log('Post deleted from Supabase successfully!')
    return {
      deletedPostId: postId,
      savedToCloud: true,
    }
  } catch (error) {
    console.error('Failed to delete post:', error)
    if (!isSupabaseConfigured) {
      const deleted = deleteLocalPost(postId)

      if (!deleted) {
        throw error instanceof Error ? error : new Error('Post not found')
      }

      return {
        deletedPostId: postId,
        savedToCloud: false,
        fallbackReason: 'Supabase is not configured.',
      }
    }

    throw error instanceof Error ? error : new Error(extractSupabaseErrorReason(error))
  }
}
