import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- Chat User table
  CREATE TABLE IF NOT EXISTS "User" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(64) NOT NULL,
    "password" varchar(64)
  );
  
  -- Chat table
  CREATE TABLE IF NOT EXISTS "Chat" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "createdAt" timestamp NOT NULL,
    "title" text NOT NULL,
    "userId" uuid NOT NULL REFERENCES "User"("id"),
    "visibility" varchar DEFAULT 'private' NOT NULL CHECK ("visibility" IN ('public', 'private')),
    "lastContext" jsonb
  );
  
  -- Message table (v2 - current version)
  CREATE TABLE IF NOT EXISTS "Message_v2" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
    "role" varchar NOT NULL,
    "parts" json NOT NULL,
    "attachments" json NOT NULL,
    "createdAt" timestamp NOT NULL
  );
  
  -- Vote table (v2 - current version)
  CREATE TABLE IF NOT EXISTS "Vote_v2" (
    "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
    "messageId" uuid NOT NULL REFERENCES "Message_v2"("id"),
    "isUpvoted" boolean NOT NULL,
    PRIMARY KEY ("chatId", "messageId")
  );
  
  -- Document table
  CREATE TABLE IF NOT EXISTS "Document" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "createdAt" timestamp NOT NULL,
    "title" text NOT NULL,
    "content" text,
    "text" varchar DEFAULT 'text' NOT NULL CHECK ("text" IN ('text', 'code', 'image', 'sheet')),
    "userId" uuid NOT NULL REFERENCES "User"("id"),
    PRIMARY KEY ("id", "createdAt")
  );
  
  -- Suggestion table
  CREATE TABLE IF NOT EXISTS "Suggestion" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "documentId" uuid NOT NULL,
    "documentCreatedAt" timestamp NOT NULL,
    "originalText" text NOT NULL,
    "suggestedText" text NOT NULL,
    "description" text,
    "isResolved" boolean DEFAULT false NOT NULL,
    "userId" uuid NOT NULL REFERENCES "User"("id"),
    "createdAt" timestamp NOT NULL,
    FOREIGN KEY ("documentId", "documentCreatedAt") REFERENCES "Document"("id", "createdAt")
  );
  
  -- Stream table
  CREATE TABLE IF NOT EXISTS "Stream" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
    "createdAt" timestamp NOT NULL
  );
  
  -- Deprecated tables (for backward compatibility)
  CREATE TABLE IF NOT EXISTS "Message" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
    "role" varchar NOT NULL,
    "content" json NOT NULL,
    "createdAt" timestamp NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS "Vote" (
    "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
    "messageId" uuid NOT NULL REFERENCES "Message"("id"),
    "isUpvoted" boolean NOT NULL,
    PRIMARY KEY ("chatId", "messageId")
  );
  
  -- Create indexes for better query performance
  CREATE INDEX IF NOT EXISTS "chat_userId_idx" ON "Chat"("userId");
  CREATE INDEX IF NOT EXISTS "message_v2_chatId_idx" ON "Message_v2"("chatId");
  CREATE INDEX IF NOT EXISTS "vote_v2_chatId_idx" ON "Vote_v2"("chatId");
  CREATE INDEX IF NOT EXISTS "document_userId_idx" ON "Document"("userId");
  CREATE INDEX IF NOT EXISTS "suggestion_documentId_idx" ON "Suggestion"("documentId");
  CREATE INDEX IF NOT EXISTS "stream_chatId_idx" ON "Stream"("chatId");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  -- Drop indexes
  DROP INDEX IF EXISTS "stream_chatId_idx";
  DROP INDEX IF EXISTS "suggestion_documentId_idx";
  DROP INDEX IF EXISTS "document_userId_idx";
  DROP INDEX IF EXISTS "vote_v2_chatId_idx";
  DROP INDEX IF EXISTS "message_v2_chatId_idx";
  DROP INDEX IF EXISTS "chat_userId_idx";
  
  -- Drop tables in reverse order (respecting foreign key constraints)
  DROP TABLE IF EXISTS "Vote";
  DROP TABLE IF EXISTS "Message";
  DROP TABLE IF EXISTS "Stream";
  DROP TABLE IF EXISTS "Suggestion";
  DROP TABLE IF EXISTS "Document";
  DROP TABLE IF EXISTS "Vote_v2";
  DROP TABLE IF EXISTS "Message_v2";
  DROP TABLE IF EXISTS "Chat";
  DROP TABLE IF EXISTS "User";
  `)
}
