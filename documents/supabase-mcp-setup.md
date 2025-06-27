# Supabase MCP Setup for here2order Project

This guide will help you set up the Supabase MCP (Model Context Protocol) server to manage your database schema directly from your AI assistant.

## Prerequisites

1. **Supabase Project**: You should have the "here2order" project set up
2. **Personal Access Token**: Create one from your Supabase dashboard
3. **Project Reference**: Get your project ref from Supabase settings

## Step 1: Create Personal Access Token

1. Go to your Supabase dashboard
2. Navigate to **Settings** → **Access Tokens**
3. Click **Create new token**
4. Name it "MCP Server Token" or similar
5. Copy the token (you won't see it again)

## Step 2: Get Project Reference

1. In your Supabase project dashboard
2. Go to **Settings** → **General**
3. Copy the **Project ID** (this is your project reference)

## Step 3: Configure MCP Client

### For Cursor

Create or update `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=your-project-ref-here"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your-personal-access-token-here"
      }
    }
  }
}
```

### For Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=your-project-ref-here"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "your-personal-access-token-here"
      }
    }
  }
}
```

### For Windsurf

1. Open Windsurf and navigate to the Cascade assistant
2. Tap on the hammer (MCP) icon, then **Configure**
3. Add the same configuration as above

## Step 4: Create the Database Schema

Once MCP is configured, you can ask your AI assistant to:

1. **Create the generated_ideas table**:
   ```
   Create a table called "generated_ideas" with the following structure:
   - id: UUID primary key (auto-generated)
   - user_id: UUID foreign key to auth.users
   - title: TEXT not null
   - hook: TEXT not null  
   - story: TEXT not null
   - viral_factors: TEXT array
   - estimated_views: TEXT not null
   - emotional_triggers: TEXT array
   - target_audience: TEXT not null
   - generation_settings: JSONB
   - is_favorite: BOOLEAN default false
   - is_used: BOOLEAN default false
   - created_at: TIMESTAMP WITH TIME ZONE default now()
   - updated_at: TIMESTAMP WITH TIME ZONE default now()
   
   Also create appropriate indexes and Row Level Security policies.
   ```

2. **Create the user_idea_stats view**:
   ```
   Create a view called "user_idea_stats" that aggregates:
   - total_ideas per user
   - favorite_ideas per user  
   - used_ideas per user
   - ideas_this_week per user
   - ideas_this_month per user
   - last_generated timestamp per user
   ```

3. **Set up RLS policies**:
   ```
   Create Row Level Security policies for the generated_ideas table so users can only:
   - View their own ideas
   - Insert their own ideas
   - Update their own ideas
   - Delete their own ideas
   ```

## Step 5: Verify Setup

Ask your AI assistant to:
1. List all tables in the database
2. Show the structure of the generated_ideas table
3. Verify RLS policies are in place

## Available MCP Tools

With Supabase MCP, your AI assistant can:

- **Database Operations**:
  - `list_tables`: List all tables
  - `apply_migration`: Apply SQL migrations
  - `execute_sql`: Run SQL queries

- **Project Management**:
  - `get_project`: Get project details
  - `get_project_url`: Get API URL
  - `get_anon_key`: Get anonymous key

- **Development**:
  - `generate_typescript_types`: Generate TypeScript types from schema

## Security Best Practices

1. **Use Read-Only Mode** (optional): Add `--read-only` flag to prevent accidental writes
2. **Project Scoping**: Always use `--project-ref` to limit access to specific project
3. **Token Security**: Keep your access token secure and don't commit it to version control

## Troubleshooting

### Common Issues

1. **MCP server not connecting**: 
   - Verify your access token is correct
   - Check project reference is accurate
   - Ensure Node.js is installed

2. **Permission errors**:
   - Verify your access token has proper permissions
   - Check you're the owner/admin of the project

3. **Windows users**: 
   - Prefix command with `cmd /c` in the configuration

### Getting Help

- Check the [Supabase MCP documentation](https://supabase.com/docs/guides/getting-started/mcp)
- Visit the [GitHub repository](https://github.com/supabase-community/supabase-mcp)
- Join the Supabase Discord for community support

## Next Steps

Once the database is set up:
1. Test the idea generation and storage functionality
2. Verify the ideas history page works correctly
3. Test favorites and search functionality
4. Monitor performance with the created indexes 