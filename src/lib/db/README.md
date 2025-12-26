# Chat Database - Unified with Payload

This directory contains the chat application's database schema and queries.

## Database Architecture

The chat application now uses **Payload's database connection** instead of maintaining a separate Drizzle instance. This prevents migration conflicts and simplifies the architecture.

## Files

- **`client.ts`** - Exports `getDb()` function that returns Payload's Drizzle instance
- **`queries.ts`** - All database query functions for chat (users, chats, messages, votes, documents, suggestions, streams)
- **`schema.ts`** - Drizzle schema definitions for chat tables
- **`utils.ts`** - Utility functions (password hashing, etc.)

## Migration Strategy

### Old System (Removed)

- ❌ `migrate.ts` - Separate migration runner
- ❌ `migrations/` - Chat-specific migrations

### New System (Current)

- ✅ Payload manages all migrations via `src/migrations/`
- ✅ Chat tables defined in `src/migrations/20251214_214500_chat_tables.ts`

## Creating Chat Tables

The chat tables are now part of Payload's migration system. To create them:

```bash
# Run all Payload migrations (including chat tables)
npx payload migrate
```

The migration file `src/migrations/20251214_214500_chat_tables.ts` contains all the SQL to create the chat tables.

## Chat Tables

The following tables are defined in `schema.ts`:

- **User** - Chat users (separate from Payload users)
- **Chat** - Chat conversations
- **Message_v2** - Chat messages with parts
- **Vote_v2** - Message votes (upvote/downvote)
- **Document** - Shared documents/artifacts
- **Suggestion** - Document edit suggestions
- **Stream** - Stream IDs for resumable streams

## Usage

All query functions in `queries.ts` automatically use Payload's database connection:

```typescript
import { getChatById, saveMessages } from '@/lib/db/queries'

// These functions now use Payload's Drizzle instance internally
const chat = await getChatById({ id: 'chat-id' })
await saveMessages({ messages: [...] })
```

## Important Notes

- The chat `User` table is separate from Payload's `users` collection
- Chat authentication is handled by `src/lib/payload-auth.ts`
- All database operations go through a single connection pool
- No need to manage separate database migrations for chat
