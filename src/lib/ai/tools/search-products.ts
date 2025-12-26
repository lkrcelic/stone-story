import { getPayloadDb } from '@/lib/db/client'
import { tool } from 'ai'
import { z } from 'zod'

export const searchProducts = tool({
  description: `Search for stone products in the database. Use this tool to help customers find products based on:
- Stone type (marble, sandstone, travertine, limestone, granite, slate, serpentinite)
- Origin country (Italy, Portugal, Spain, Norway, Sweden, Finland, Germany, UK, France, Austria, Malta, Poland, Greece, Slovenia, Croatia)
- Product name or title
- Price range
- Availability (in stock)
You can search by multiple criteria at once. Always use this tool when customers ask about products, stones, materials, or want to browse the catalog.`,
  inputSchema: z.object({
    query: z.string().optional().describe('General search query for product title or description'),
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
    limit: z
      .number()
      .min(1)
      .max(20)
      .default(10)
      .describe('Maximum number of results to return (1-20)'),
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
      if (input.query) {
        where.or = [
          { title: { contains: input.query } },
          { short_description: { contains: input.query } },
          { description: { contains: input.query } },
        ]
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
