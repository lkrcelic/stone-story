import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Drop the separate User table created by chat migration
    DROP TABLE IF EXISTS "User" CASCADE;
    
    -- Alter Chat table to use text for userId instead of uuid
    ALTER TABLE "Chat" 
    ALTER COLUMN "userId" TYPE text USING "userId"::text;
    
    -- Alter Document table to use text for userId instead of uuid
    ALTER TABLE "Document" 
    ALTER COLUMN "userId" TYPE text USING "userId"::text;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    -- Revert userId columns back to uuid
    ALTER TABLE "Chat" 
    ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
    
    ALTER TABLE "Document" 
    ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;
    
    -- Recreate User table
    CREATE TABLE IF NOT EXISTS "User" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "email" varchar(64) NOT NULL,
      "password" varchar(64)
    );
  `)
}
