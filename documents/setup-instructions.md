# Setup Instructions for Brainrot Video Generator

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Google Cloud Console**: Create a project at [console.cloud.google.com](https://console.cloud.google.com)

## Supabase Setup

### 1. Create a New Project
- Go to your Supabase dashboard
- Click "New Project"
- Choose your organization and enter project details
- Wait for the project to be provisioned

### 2. Get Your Project Credentials
- Go to **Settings** → **API**
- Copy your **Project URL** and **anon/public key**

### 3. Configure Authentication
- Go to **Authentication** → **Providers**
- Enable **Google** provider
- You'll need to configure Google OAuth (see below)

## Google OAuth Setup

### 1. Create Google OAuth Credentials
- Go to [Google Cloud Console](https://console.cloud.google.com)
- Create a new project or select existing one
- Enable **Google+ API**
- Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
- Choose **Web application**
- Add authorized redirect URI: `https://your-project-ref.supabase.co/auth/v1/callback`

### 2. Configure in Supabase
- In Supabase, go to **Authentication** → **Providers** → **Google**
- Enable the provider
- Enter your **Client ID** and **Client Secret** from Google Console
- Save the configuration

## Environment Variables

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (for AI idea generation)
OPENAI_API_KEY=your_openai_api_key
```

Replace with your actual credentials:
- `your-project-ref` and `your_supabase_anon_key` with your Supabase credentials
- `your_openai_api_key` with your OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)

## Database Setup

### Create the Ideas Storage Table

The application requires a database table to store generated ideas. Choose one of these methods:

#### Option A: Using Supabase MCP (Recommended for AI Assistants)
1. Follow the complete guide in `documents/supabase-mcp-setup.md`
2. Set up the Supabase MCP server with your AI assistant (Cursor, Claude, etc.)
3. Ask your AI assistant to create the database schema directly
4. This method allows your AI to manage the database through natural language

#### Option B: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and run the SQL from `sql/001_create_generated_ideas_table.sql`
4. Click **Run** to execute the migration

#### Option C: Using Supabase CLI
1. Login to Supabase CLI: `npx supabase login`
2. Link your project: `npx supabase link --project-ref your-project-ref`
3. Run the migration: `npx supabase db push`

The migration creates:
- `generated_ideas` table to store AI-generated story ideas
- Proper indexes for performance optimization
- Row Level Security (RLS) policies for data protection
- `user_idea_stats` view for analytics
- Auto-updating timestamp triggers

## Run the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- **Google Authentication**: Sign in with your Google account
- **AI-Powered Idea Generation**: Generate viral Reddit story ideas using GPT-4
- **Idea History & Management**: Save, search, filter, and organize your generated ideas
- **Favorites System**: Mark your best ideas for easy access
- **Modern Dashboard**: Production-ready UI with comprehensive analytics
- **Secure Database**: Row-level security with Supabase
- **Responsive Design**: Modern UI with shadcn/ui components
- **TypeScript**: Fully typed for better development experience

## Next Steps

- Add user profiles and settings
- Implement story generation features
- Add video creation functionality
- Set up automated publishing

## Troubleshooting

### Common Issues

1. **Authentication not working**: 
   - Check your environment variables
   - Verify Google OAuth configuration
   - Ensure redirect URLs match

2. **Build errors**:
   - Make sure all dependencies are installed
   - Check TypeScript configurations

3. **Supabase connection issues**:
   - Verify project URL and API keys
   - Check network connectivity
   - Review Supabase project status 