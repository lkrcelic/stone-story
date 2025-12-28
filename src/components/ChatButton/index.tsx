'use client'

import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

export const ChatButton: React.FC = () => {
  return (
    <Link
      href="/chat"
      className="fixed bottom-12 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center"
      aria-label="Go to chat"
    >
      <Image
        src="/chat.png"
        alt=""
        width={32}
        height={32}
        aria-hidden="true"
        className="invert dark:invert-0"
      />
    </Link>
  )
}
