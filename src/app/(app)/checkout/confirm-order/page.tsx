import type { Metadata } from 'next'

import { ConfirmOrder } from '@/components/checkout/ConfirmOrder'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { Suspense } from 'react'

// type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>

export default async function ConfirmOrderPage() {
  return (
    <div className="container min-h-[90vh] flex py-12">
      <Suspense fallback={<LoadingSpinner />}>
        <ConfirmOrder />
      </Suspense>
    </div>
  )
}

export const metadata: Metadata = {
  description: 'Confirm order.',
  openGraph: mergeOpenGraph({
    title: 'Confirming order',
    url: '/checkout/confirm-order',
  }),
  title: 'Confirming order',
}
