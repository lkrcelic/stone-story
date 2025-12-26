import { Chat } from '@/components/ChatBot/chat'
import { DataStreamHandler } from '@/components/ChatBot/data-stream-handler'
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models'
import { auth } from '@/lib/payload-auth'
import { generateUUID } from '@/lib/utils'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <NewChatPage />
    </Suspense>
  )
}

async function NewChatPage() {
  const session = await auth()

  if (!session) {
    redirect('/api/auth/guest')
  }

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
