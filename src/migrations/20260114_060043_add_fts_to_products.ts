import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Migration to add PostgreSQL full-text search to products table
 * Adds:
 * - search_vector column (tsvector type)
 * - GIN index on search_vector for fast full-text search
 * - Trigger to automatically update search_vector on insert/update
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    -- Add tsvector column for full-text search
    ALTER TABLE products 
    ADD COLUMN IF NOT EXISTS search_vector tsvector;

    -- Create GIN index for fast full-text search
    CREATE INDEX IF NOT EXISTS products_search_vector_idx 
    ON products USING GIN(search_vector);

    -- Create function to update search_vector
    CREATE OR REPLACE FUNCTION products_search_vector_update() 
    RETURNS trigger AS $$
    BEGIN
      NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.short_description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.description_search, '')), 'B');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Create trigger to automatically update search_vector
    DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
    CREATE TRIGGER products_search_vector_trigger
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION products_search_vector_update();

    -- Populate search_vector for existing products
    UPDATE products
    SET search_vector = 
      setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(short_description, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(description_search, '')), 'B')
    WHERE search_vector IS NULL;
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    -- Drop trigger
    DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
    
    -- Drop function
    DROP FUNCTION IF EXISTS products_search_vector_update();
    
    -- Drop index
    DROP INDEX IF EXISTS products_search_vector_idx;
    
    -- Drop column
    ALTER TABLE products DROP COLUMN IF EXISTS search_vector;
  `)
}
