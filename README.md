# Meno Augusta - Wuthering Waves Inspired Starfield

A beautiful interactive starfield application inspired by Augusta from Wuthering Waves. Create and share your thoughts as stars in an elegant cosmic canvas.

## Features

- **Interactive Starfield**: Click anywhere to create beautiful Augusta-inspired golden stars
- **Rich Content**: Add titles, text, and images to your star posts
- **Ambient Music**: Beautiful background music creates an immersive cosmic experience
- **Elegant Design**: Wuthering Waves Augusta-inspired color palette and aesthetics
- **Persistent Cloud Storage**: Your creations are saved in Supabase and accessible from anywhere
- **Account Ownership**: Each star belongs to the signed-in username that created it
- **Owner Colors**: Every username gets a consistent star color so ownership is visible at a glance
- **Cross-Device Sync**: View your stars on any device, anywhere in the world
- **Mobile-Friendly**: Optimized for phones, tablets, and desktop devices
- **Responsive UI**: Beautiful modal interface for creating and viewing posts

## Setting Up Background Music

To add your custom background music:

1. **Add Music File**: Copy your music file to `public/background-music.mp3`
2. **See Setup Guide**: Check `MUSIC_SETUP.md` for detailed instructions
3. **Auto-Play**: Music starts automatically on first user interaction
4. **Controls**: Use the 🎵 button to toggle music on/off

## Setting Up Cloud Storage (Supabase)

To enable cloud storage and make your stars accessible from anywhere:

1. **Follow the Setup Guide**: See `SUPABASE_SETUP.md` for detailed instructions
2. **Quick Setup**: 
   - Create a fresh Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `supabase-schema.sql`
   - Copy `.env.example` to `.env` and add your new credentials
   - Restart the dev server
3. **Create Accounts**: Users must sign in before creating, editing, or deleting stars. Each signed-in username owns its own posts.

Without Supabase setup, the app will still work offline using local storage.

If Supabase breaks later, the app falls back to local storage automatically, so the birthday page keeps working while you create a fresh project.

## Running the Project

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation & Development

1. Clone or download this project
2. Navigate to the project directory:
   ```bash
   cd meno-augusta
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and visit the local server URL (usually `http://localhost:5173` or `http://localhost:5174`)

### Building for Production

To build the project for deployment:

```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to Vercel, Netlify, or any static hosting service.

## How to Use

1. **Create a Star**: Click anywhere on the canvas to open the creation modal
2. **Sign In**: Use the account button in the top bar to create an account or sign in
3. **Add Content**: Fill in your title, text, and optionally upload an image
4. **Publish**: Click "نشر" (Publish) to create your star
5. **View Stars**: Click on any existing star to view its content
6. **Manage Your Stars**: Edit and delete are available only for the stars owned by your account

## Technology Stack

- **PixiJS**: High-performance 2D graphics rendering
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Supabase**: Cloud database for persistent storage
- **Supabase Auth**: Email/password accounts and ownership-based access control
- **Vercel Analytics**: User behavior and performance tracking
- **CSS3**: Modern styling with Augusta-inspired themes

## Deployment

This project is ready for deployment on:
- **Vercel** (recommended)
- **Netlify** 
- **GitHub Pages**
- Any static hosting service

Simply upload the contents of the `dist` folder after running `npm run build`.

## Future Enhancements

- User authentication and private starfields
- Augusta character artwork integration
- Advanced star animations and effects
- Mobile app version
- Real-time collaboration features

---

*Inspired by the elegance and cosmic beauty of Augusta from Wuthering Waves*
