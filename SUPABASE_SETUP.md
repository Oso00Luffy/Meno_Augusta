# Supabase Setup Guide for Meno Augusta

Follow these steps to set up Supabase for cloud storage and make your stars accessible from anywhere!

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up for a free account (if you don't have one)
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `meno-augusta` (or any name you prefer)
   - **Database Password**: Create a strong password (save it somewhere safe)
   - **Region**: Choose the closest region to you for better performance
6. Click "Create new project"
7. Wait for the project to be created (this can take 1-2 minutes)

## Step 2: Set Up the Database Schema

1. In your Supabase dashboard, go to the **SQL Editor** (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` file
4. Paste it into the SQL editor
5. Click "Run" to execute the schema
6. You should see "Success. No rows returned" message

## Step 3: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API** (left sidebar)
2. Find these two values:
   - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
   - **anon/public key** (a long JWT token starting with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 4: Configure Your Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Example:**
```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNjU1MDgzMSwiZXhwIjoxOTUyMTI2ODMxfQ.example-signature
```

## Step 5: Restart Your Development Server

1. Stop your current development server (Ctrl+C in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

## Step 6: Test the Integration

1. Open your app in the browser
2. Try creating a new star with title, text, and image
3. Click "نشر" (Publish)
4. If successful, you should see "تم النشر بنجاح! ✨" message
5. Check your Supabase dashboard:
   - Go to **Table Editor** → **posts**
   - You should see your new post in the database!

## Step 7: Test Cross-Device Access

1. Open your app on a different device or browser
2. You should see the same stars you created!
3. Create a new star from the second device
4. Both devices should now show all stars

## Troubleshooting

### Common Issues:

**Error: "Failed to load posts from Supabase"**
- Check your environment variables are correct
- Make sure you've run the database schema
- Verify your Supabase project is active

**Error: "Insert" policy violated**
- Make sure you've run the RLS policies from the schema
- Check that the `posts` table exists

**Stars not appearing after refresh**
- Check browser console for errors
- Verify the `renderAllStars()` function is being called
- Check Supabase Table Editor to see if data is actually saved

### Security Notes:

- The current setup allows anyone to read and create posts (perfect for a public starfield)
- If you want user authentication later, Supabase makes it easy to add
- The cleanup function prevents infinite database growth

### Deployment:

When deploying to Vercel/Netlify:
1. Add your environment variables in the hosting platform's dashboard
2. The app will automatically use cloud storage instead of localStorage
3. Your stars will persist forever! ✨

## Enjoy Your Global Starfield! 🌟

Your Augusta-inspired starfield is now powered by the cloud. Stars created anywhere in the world will appear for everyone to see!
