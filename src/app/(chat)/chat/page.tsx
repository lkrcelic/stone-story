import { Chat } from '@/components/ChatBot/chat'
import { DataStreamHandler } from '@/components/ChatBot/data-stream-handler'
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models'
import { generateUUID } from '@/lib/utils'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Chat',
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <NewChatPage />
    </Suspense>
  )
}

async function NewChatPage() {
  const id = generateUUID()

  const cookieStore = await cookies()
  const modelIdFromCookie = cookieStore.get('chat-model')

  if (!modelIdFromCookie) {
    return (
      <>
        <Chat
          autoResume={false}
          id={id}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialMessages={[]}
          initialVisibilityType="private"
          isReadonly={false}
          key={id}
        />
        <DataStreamHandler />
      </>
    )
  }

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialChatModel={modelIdFromCookie.value}
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
    </>
  )
}
