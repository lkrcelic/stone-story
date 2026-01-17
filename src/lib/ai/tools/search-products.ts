import { getPayloadDb } from '@/lib/db/client'
import { sql } from '@payloadcms/db-postgres'
import { tool } from 'ai'
import { z } from 'zod'

export const searchProducts = tool({
  description: `Search for stone products in the database. You can call this tool multiple times to gather information.

IMPORTANT: ALWAYS use this tool when users ask about stone types, availability, or any product-related questions.

Search criteria:
- Stone type (marble, sandstone, travertine, limestone, granite, slate, serpentinite) - use the 'type' parameter
- Origin country (Italy, Portugal, Spain, Norway, Sweden, Finland, Germany, UK, France, Austria, Malta, Poland, Greece, Slovenia, Croatia) - use the 'origin' parameter
- Product name or descriptive keywords (colors, features, characteristics) - use the 'query' parameter
- Price range - use minPrice/maxPrice parameters (results are automatically sorted by price)
- Availability (in stock) - use the 'inStock' parameter
- Limit - control how many results to return (1-10)

CRITICAL: Any descriptive words like colors (blue, grey, red), features (polished, rough), usage (facades, flooring, paving), functionality, or characteristics that are NOT stone types or origins MUST be passed in the 'query' parameter. The query parameter uses PostgreSQL full-text search with stemming and relevance ranking to search through product titles, descriptions, and features.

SIMILARITY QUERIES:
When asked for "similar to X" or "like X", search using descriptive characteristics from the product's description, not just the name:
- Extract key features: color, pattern, finish, origin, type
- Use these features in the query parameter to find similar products
- Example: "similar to Botticino Classico" → Look up Botticino first, then search for: query: "beige cream Italian marble", type: "marble", limit: 8

LIMIT PARAMETER:
- Specific product lookup (e.g., "Is Bohus Red available?") → limit: 1-2
- "Similar to X" or "like X" queries → limit: 8-10 (show variety)
- "Top N" queries → limit: N (match the number requested)
- Browsing/exploration (e.g., "show me marble") → limit: 10
- Comparison queries → limit: 5-8
- When using Most expensive/cheapest find all with the same pricing that fit the condition - variable limit
- Default: limit: 10

PRICE SORTING:
- Setting minPrice without maxPrice → Results sorted by price DESCENDING (most expensive first)
- Setting maxPrice without minPrice → Results sorted by price ASCENDING (cheapest first)
- For "most expensive" queries: Set minPrice to 0 to trigger descending sort
- For "cheapest" queries: Set maxPrice to 999999 to trigger ascending sort

MULTI-STEP QUERIES:
You can call this tool multiple times to answer complex questions:
- "What's the price range?" → Call twice: once with minPrice: 0, limit: 1 (most expensive), once with maxPrice: 999999, limit: 1 (cheapest)
- "Compare expensive vs cheap marble" → Call twice with type: "marble" and different price parameters

Examples:
- "blue granite" → type: "granite", query: "blue", limit: 10
- "Italian marble" → type: "marble", origin: "italy", limit: 10
- "stones similar to Botticino" → query: "Botticino", limit: 8
- "most expensive stone" → minPrice: 0, limit: 1
- "top 5 cheapest marble" → type: "marble", maxPrice: 999999, limit: 5
- "what is granite used for" → type: "granite", query: "used for", limit: 10

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
    minPrice: z
      .number()
      .optional()
      .describe('Minimum price in USD, use this when asked about prices'),
    maxPrice: z
      .number()
      .optional()
      .describe('Maximum price in USD, use this when asked about prices'),
    inStock: z.boolean().optional().describe('Filter for products in stock'),
    limit: z.number().min(1).max(10).optional().describe('Maximum number of results to return'),
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
      let idRankMap: Map<number, number> | null = null as Map<number, number> | null
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
              LIMIT 10
            `,
          )
          // Log stone names and Id returned by search also display ts_rank value they got
          console.log(
            '[PRODUCT SEARCH] Full-text search results: ',
            result.rows.map((row: any) => ({
              id: row.id,
              name: row.name,
              rank: row.rank,
            })),
          )

          // Store IDs with their rank order for sorting later
          searchMatchingIds = result.rows.map((row: any) => row.id)
          idRankMap = new Map(result.rows.map((row: any, index: number) => [row.id, index]))

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

      // Determine sort order based on filters
      let sort: string | undefined
      if (input.minPrice !== undefined && input.maxPrice === undefined) {
        // minPrice only = looking for expensive products, sort descending
        sort = '-priceInUSD'
      } else if (input.maxPrice !== undefined && input.minPrice === undefined) {
        // maxPrice only = looking for cheap products, sort ascending
        sort = 'priceInUSD'
      } else if (input.minPrice !== undefined && input.maxPrice !== undefined) {
        // Both set = specific range, sort descending to show higher-priced items first
        sort = '-priceInUSD'
      }

      const result = await payload.find({
        collection: 'products',
        where,
        limit: input.limit,
        depth: 1,
        sort,
      })

      console.log('[PRODUCT SEARCH] Found', result.docs.length, 'products')

      // Sort results by FTS relevance if we did a full-text search
      // Only apply FTS sorting if no price sorting was applied
      let sortedDocs = result.docs
      if (idRankMap && idRankMap.size > 0 && !sort) {
        const rankMap = idRankMap // Capture for closure
        sortedDocs = [...result.docs].sort((a: any, b: any) => {
          const rankA = rankMap.get(a.id) ?? Infinity
          const rankB = rankMap.get(b.id) ?? Infinity
          return rankA - rankB // Lower index = higher rank = better match
        })
      }

      // Format the results for the AI
      const products = sortedDocs.map((product: any) => {
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
