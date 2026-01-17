import { getPayloadDb } from '@/lib/db/client'
import { sql } from '@payloadcms/db-postgres'
import { tool } from 'ai'
import { z } from 'zod'

export const searchProducts = tool({
  description: `Search for stone products in the database. 

IMPORTANT: ALWAYS use this tool when users ask about stone types, availability, or any product-related questions.

Search criteria:
- Stone type (marble, sandstone, travertine, limestone, granite, slate, serpentinite) - use the 'type' parameter
- Origin country (Italy, Portugal, Spain, Norway, Sweden, Finland, Germany, UK, France, Austria, Malta, Poland, Greece, Slovenia, Croatia) - use the 'origin' parameter
- Product name or descriptive keywords (colors, features, characteristics) - use the 'query' parameter
- Price range - use minPrice/maxPrice parameters
- Availability (in stock) - use the 'inStock' parameter

CRITICAL: Any descriptive words like colors (blue, grey, red), features (polished, rough), usage (facades, flooring, paving), functionality, or characteristics that are NOT stone types or origins MUST be passed in the 'query' parameter. The query parameter uses PostgreSQL full-text search with stemming and relevance ranking to search through product titles, descriptions, and features.

Examples:
- "blue granite" → type: "granite", query: "blue"
- "Italian marble" → type: "marble", origin: "italy"
- "grey sandstone from UK" → type: "sandstone", origin: "uk", query: "grey"
- "polished limestone" → type: "limestone", query: "polished"
- "stone for facades" → query: "facades"
- "what is granite used for" → type: "granite", query: "used for"
- "interesting limestone features" → type: "limestone", query: "interesting features"

Always use this tool when customers ask about products, stones, materials, or want to browse the catalog.`,
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe(
        'Full-text search query for product title, description, and features. Use this for ANY descriptive keywords like colors (blue, grey, red), characteristics (polished, rough), usage (facades, flooring, paving, retaining walls), functionality, interesting features, or specific product names. This searches through the full product description using PostgreSQL full-text search with stemming and relevance ranking.',
      ),
    type: z
      .enum(['marble', 'sandstone', 'travertine', 'limestone', 'granite', 'slate', 'serpentinite'])
      .optional()
      .describe('Type of stone'),
    origin: z
      .enum([
        'italy',
        'portugal',
        'spain',
        'norway',
        'sweden',
        'finland',
        'germany',
        'uk',
        'france',
        'austria',
        'malta',
        'poland',
        'greece',
        'slovenia',
        'croatia',
      ])
      .optional()
      .describe('Country or region of origin'),
    minPrice: z.number().optional().describe('Minimum price in USD'),
    maxPrice: z.number().optional().describe('Maximum price in USD'),
    inStock: z.boolean().optional().describe('Filter for products in stock'),
    limit: z.number().min(1).max(15).describe('Maximum number of results to return (1-15)'),
  }),
  execute: async (input) => {
    try {
      console.log('[PRODUCT SEARCH] Searching products with criteria:', input)

      const payload = await getPayloadDb()

      // Build the where clause dynamically
      const where: any = {
        _status: { equals: 'published' },
      }

      // Add text search if query is provided
      // Use PostgreSQL full-text search with tsvector for intelligent matching
      let searchMatchingIds: number[] | null = null
      if (input.query) {
        const searchQuery = input.query
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .filter((word) => word.length > 2) // Ignore very short words
          .map((word) => `${word}:*`) // Prefix matching for partial words
          .join(' | ') // OR logic - match any word, rank higher if more words match

        if (searchQuery) {
          // Use raw SQL to leverage PostgreSQL's full-text search
          // Get matching product IDs with relevance ranking
          console.log('[PRODUCT SEARCH] Full-text search query used: ', searchQuery)
          const db = payload.db
          const result = await db.drizzle.execute(
            sql`
              SELECT id, ts_rank(search_vector, to_tsquery('english', ${searchQuery})) as rank
              FROM products 
              WHERE search_vector @@ to_tsquery('english', ${searchQuery})
                AND _status = 'published'
                AND deleted_at IS NULL
                AND ts_rank(search_vector, to_tsquery('english', ${searchQuery})) >= 0.2
              ORDER BY rank DESC
              LIMIT 15
            `,
          )
          searchMatchingIds = result.rows.map((row: any) => row.id)

          // If no matches found, return early
          if (searchMatchingIds?.length === 0) {
            return {
              success: true,
              count: 0,
              total: 0,
              products: [],
              message: 'No products found matching your search query. Try different keywords.',
            }
          }

          // Add the matching IDs to the where clause
          where.id = { in: searchMatchingIds }
        }
      }

      // Add type filter
      if (input.type) {
        where.type = { equals: input.type }
      }

      // Add origin filter
      if (input.origin) {
        where.origin = { equals: input.origin }
      }

      // Add price filters
      if (input.minPrice !== undefined || input.maxPrice !== undefined) {
        where.priceInUSD = {}
        if (input.minPrice !== undefined) {
          where.priceInUSD.greater_than_equal = input.minPrice
        }
        if (input.maxPrice !== undefined) {
          where.priceInUSD.less_than_equal = input.maxPrice
        }
      }

      // Add stock filter
      if (input.inStock === true) {
        where.and = [
          ...(where.and ?? []),
          { inventory: { exists: true } },
          { inventory: { greater_than: 0 } },
        ]
      }

      console.log('[PRODUCT SEARCH] Query where clause:', JSON.stringify(where, null, 2))

      const result = await payload.find({
        collection: 'products',
        where,
        limit: input.limit,
        depth: 1,
      })

      console.log('[PRODUCT SEARCH] Found', result.docs.length, 'products')

      // Format the results for the AI
      const products = result.docs.map((product: any) => {
        const gallery = product.gallery || []
        const images = gallery
          .map((item: any) => {
            if (item?.image && typeof item.image === 'object') {
              return {
                url: item.image.url,
                alt: item.image.alt || product.title,
                filename: item.image.filename,
              }
            }
            return null
          })
          .filter(Boolean)

        return {
          id: product.id,
          title: product.title,
          description: product.short_description || 'No description available',
          type: product.type,
          origin: product.origin,
          price: product.priceInUSD,
          inStock: product.inventory > 0,
          stock: product.inventory,
          slug: product.slug,
          hasVariants: product.enableVariants || false,
          images,
        }
      })

      return {
        success: true,
        count: products.length,
        total: result.totalDocs,
        products,
        message:
          products.length > 0
            ? `Found ${products.length} product(s) matching your criteria.`
            : 'No products found matching your criteria. Try adjusting your search parameters.',
      }
    } catch (error) {
      console.error('[PRODUCT SEARCH] Error searching products:', error)
      return {
        success: false,
        error: 'Failed to search products. Please try again.',
        products: [],
      }
    }
  },
})
