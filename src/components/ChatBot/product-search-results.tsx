import { Price } from '@/components/ChatBot/Price'
import Image from 'next/image'
import Link from 'next/link'

type ProductSearchOutput = {
  success: boolean
  count: number
  total: number
  products: Array<{
    id: number
    title: string
    description: string
    type: string
    origin: string
    price: number
    inStock: boolean
    stock: number
    slug: string
    hasVariants: boolean
    images: Array<{
      url: string
      alt: string
      filename: string
    }>
  }>
  message: string
}

export function ProductSearchResults({ output }: { output: ProductSearchOutput }) {
  if (!output.success || output.products.length === 0) {
    return null // Don't show anything when no products are found
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {output.products.map((product) => {
          const firstImage = product.images?.[0]

          return (
            <Link
              className="group relative flex w-[280px] shrink-0 flex-col overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg"
              href={`/products/${product.slug}`}
              key={product.id}
            >
              {firstImage ? (
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  <Image
                    alt={firstImage.alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    src={firstImage.url}
                  />
                </div>
              ) : (
                <div className="relative aspect-square w-full bg-muted" />
              )}

              <div className="flex flex-col gap-2 p-4">
                <h3 className="font-medium text-sm line-clamp-2">{product.title}</h3>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{product.type}</span>
                  {product.origin && <span className="capitalize">{product.origin}</span>}
                </div>

                {product.price && (
                  <div className="mt-auto pt-2">
                    <Price amount={product.price} />
                  </div>
                )}

                {!product.inStock && <div className="text-xs text-red-500">Out of stock</div>}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
