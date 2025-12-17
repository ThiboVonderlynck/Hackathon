# Supabase Setup Guide

This guide will help you set up Supabase for the NERD.HUB chat functionality.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in your project details:
   - Name: `nerdhub` (or any name you prefer)
   - Database Password: Choose a strong password (save this!)
   - Region: Choose the closest region to your users
4. Click "Create new project" and wait for it to be set up (~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (this is your `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon/public key** (this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Step 3: Set Up the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase-schema.sql` into the editor
4. Click "Run" to execute the SQL
5. You should see a success message

This will create:

- A `messages` table for storing chat messages
- Indexes for efficient querying
- Row Level Security (RLS) policies for data access

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in the root of your project (if it doesn't exist)
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Replace the values with your actual Supabase project URL and anon key from Step 2

## Step 5: Enable Realtime (Important!)

1. In your Supabase dashboard, go to **Database** → **Replication**
2. Find the `messages` table
3. Toggle the switch to enable replication for the `messages` table
4. This allows real-time updates when new messages are added

## Step 6: Test the Chat

1. Start your development server: `npm run dev`
2. Navigate to the chat tab in your app
3. Try sending a message
4. Open the app in another browser/incognito window to test real-time updates

## Troubleshooting

### Messages not appearing in real-time

- Make sure Realtime is enabled for the `messages` table (Step 5)
- Check that your environment variables are set correctly
- Verify your Supabase project is active (not paused)

### "Supabase is not configured" error

- Make sure `.env.local` exists and has the correct variables
- Restart your development server after adding environment variables
- Check that variable names start with `NEXT_PUBLIC_`

### Can't insert messages

- Check the RLS policies in your Supabase dashboard
- Verify the `messages` table was created successfully
- Check the browser console for specific error messages

## Security Notes

- The current setup allows anyone to read and insert messages (for simplicity)
- For production, you should:
  - Add authentication (Supabase Auth)
  - Update RLS policies to restrict access
  - Add rate limiting
  - Implement message moderation

## Next Steps

- Add user authentication with Supabase Auth
- Implement message editing/deletion
- Add message reactions
- Implement pagination for older messages
- Add file/image uploads
