import { createClient, type Session } from '@supabase/supabase-js'

// These will be your Supabase project credentials
// You'll get these from your Supabase dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

// Check if Supabase is properly configured
export const isSupabaseConfigured = supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseKey !== 'YOUR_SUPABASE_ANON_KEY'
const OWNER_COLORS = ['#d4af37', '#4a9eff', '#a855f7', '#22c55e', '#f59e0b', '#f472b6', '#38bdf8']
const INTERNAL_EMAIL_DOMAIN = 'local.dev'

// Custom storage for Supabase auth - use memory-based storage to avoid localStorage quota issues
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.get(key) || null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys())
    return keys[index] || null
  }

  get length(): number {
    return this.store.size
  }
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: new MemoryStorage(),
    autoRefreshToken: true,
    persistSession: false,
  }
})

// Database types for our posts
export interface Post {
  id?: string
  owner_id?: string
  owner_username?: string
  owner_color?: string
  title: string
  text: string
  image?: string
  x: number
  y: number
  created_at?: string
}

export interface AuthUserSummary {
  id: string
  username: string
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

export interface AuthState {
  user: AuthUserSummary | null
  session: Session | null
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

function sanitizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').replace(/^[._-]+|[._-]+$/g, '').slice(0, 24)
}

function usernameToInternalEmail(username: string): string {
  const normalized = sanitizeUsername(username)
  return `${normalized}@${INTERNAL_EMAIL_DOMAIN}`
}

function normalizeUser(session: Session | null): AuthUserSummary | null {
  const user = session?.user
  if (!user) {
    return null
  }

  const metadataUsername = user.user_metadata && typeof user.user_metadata.username === 'string'
    ? user.user_metadata.username
    : ''
  const fallbackUsername = user.email?.split('@')[0] ?? ''

  return {
    id: user.id,
    username: sanitizeUsername(metadataUsername || fallbackUsername),
  }
}

function getColorForUsername(username: string): string {
  let hash = 0

  for (let index = 0; index < username.length; index += 1) {
    hash = (hash * 31 + username.charCodeAt(index)) >>> 0
  }

  return OWNER_COLORS[hash % OWNER_COLORS.length]
}

function getAuthRequiredError(): Error {
  return new Error('Authentication required. Please sign in to create, edit, or delete your stars.')
}

export async function getAuthState(): Promise<AuthState> {
  if (!isSupabaseConfigured) {
    return { user: null, session: null }
  }

  const { data } = await supabase.auth.getSession()
  return {
    user: normalizeUser(data.session),
    session: data.session,
  }
}

// onAuthStateChange subscribes to auth session changes so the UI can react to sign-in and sign-out.
export function onAuthStateChange(callback: (state: AuthState) => void) {
  if (!isSupabaseConfigured) {
    callback({ user: null, session: null })
    return { data: { subscription: { unsubscribe() {} } } }
  }

  return supabase.auth.onAuthStateChange((_event, session) => {
    callback({
      user: normalizeUser(session),
      session,
    })
  })
}

export async function signInWithUsername(username: string, password: string): Promise<AuthUserSummary> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const normalizedUsername = sanitizeUsername(username)
  if (!normalizedUsername) {
    throw new Error('Username is required.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToInternalEmail(normalizedUsername),
    password,
  })
  if (error) {
    throw error
  }

  const user = normalizeUser(data.session)
  if (!user) {
    throw new Error('Sign-in completed but no session was returned.')
  }

  return user
}

export async function signUpWithUsername(username: string, password: string): Promise<AuthUserSummary | null> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const normalizedUsername = sanitizeUsername(username)
  if (!normalizedUsername) {
    throw new Error('Username is required.')
  }

  const { data, error } = await supabase.auth.signUp({
    email: usernameToInternalEmail(normalizedUsername),
    password,
    options: {
      data: {
        username: normalizedUsername,
      },
    },
  })
  if (error) {
    throw error
  }

  return normalizeUser(data.session)
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) {
    return
  }

  const { error } = await supabase.auth.signOut()
  if (error) {
    throw error
  }
}

// Supabase database functions
export async function savePosts(_posts: Post[]): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  throw new Error('Bulk save is disabled in authenticated mode. Use addPost, updatePost, and deletePost instead.')
}

export async function loadPosts(): Promise<Post[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading posts:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Failed to load posts:', error)
    throw error instanceof Error ? error : new Error(extractSupabaseErrorReason(error))
  }
}

export async function addPost(post: Omit<Post, 'id' | 'created_at'>): Promise<AddPostResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  try {
    const { user } = await getAuthState()
    if (!user) {
      throw getAuthRequiredError()
    }

    const insertPayload = {
      title: post.title,
      text: post.text,
      image: post.image,
      x: post.x,
      y: post.y,
      owner_color: post.owner_color,
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([insertPayload])
      .select('*')
      .single()

    if (error) {
      console.error('Error adding post:', error)
      throw error
    }

    const savedPost = (data as Post) ?? {
      ...post,
      owner_id: user.id,
      owner_username: user.username,
      owner_color: getColorForUsername(user.username),
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }

    console.log('Post added to Supabase successfully!')
    return {
      post: savedPost,
      savedToCloud: true,
    }
  } catch (error) {
    console.error('Failed to add post:', error)
    throw error instanceof Error ? error : new Error(extractSupabaseErrorReason(error))
  }
}

export async function updatePost(
  postId: string,
  updates: Partial<Omit<Post, 'id' | 'created_at'>>,
  existingPost?: Post
): Promise<UpdatePostResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  try {
    const { user } = await getAuthState()
    if (!user) {
      throw getAuthRequiredError()
    }

    if (existingPost?.owner_id && existingPost.owner_id !== user.id) {
      throw new Error('You can only edit your own stars.')
    }

    const { data, error } = await supabase
      .from('posts')
      .update({
        title: updates.title,
        text: updates.text,
        image: updates.image,
        x: updates.x,
        y: updates.y,
        owner_color: updates.owner_color,
      })
      .eq('id', postId)
      .select('*')
      .single()

    if (error) {
      console.error('Error updating post:', error)
      throw error
    }

    console.log('Post updated in Supabase successfully!')
    return {
      post: (data as Post) ?? {
        ...existingPost,
        ...updates,
        id: existingPost?.id ?? postId,
        created_at: existingPost?.created_at,
      },
      savedToCloud: true,
    }
  } catch (error) {
    console.error('Failed to update post:', error)
    throw error instanceof Error ? error : new Error(extractSupabaseErrorReason(error))
  }
}

export async function deletePost(postId: string): Promise<DeletePostResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  try {
    const { user } = await getAuthState()
    if (!user) {
      throw getAuthRequiredError()
    }

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
    throw error instanceof Error ? error : new Error(extractSupabaseErrorReason(error))
  }
}
