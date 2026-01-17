import type { VisibilityType } from '@/components/ChatBot/visibility-selector'
import { entitlementsByUserType } from '@/lib/ai/entitlements'
import type { ChatModel } from '@/lib/ai/models'
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts'
import { myProvider } from '@/lib/ai/providers'
import { searchProducts } from '@/lib/ai/tools/search-products'
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
} from '@/lib/db/queries'
import type { DBMessage } from '@/lib/db/types'
import { ChatSDKError } from '@/lib/errors'
import { auth } from '@/lib/payload-auth'
import type { ChatMessage } from '@/lib/types'
import type { AppUsage } from '@/lib/usage'
import { convertToUIMessages, generateUUID } from '@/lib/utils'
import { geolocation } from '@vercel/functions'
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai'
import { unstable_cache as cache } from 'next/cache'
import { after } from 'next/server'
import { createResumableStreamContext, type ResumableStreamContext } from 'resumable-stream'
import type { ModelCatalog } from 'tokenlens/core'
import { fetchModels } from 'tokenlens/fetch'
import { getUsage } from 'tokenlens/helpers'
import { generateTitleFromUserMessage } from '../../actions'
import { type PostRequestBody, postRequestBodySchema } from './schema'

export const maxDuration = 60

let globalStreamContext: ResumableStreamContext | null = null

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels()
    } catch (err) {
      console.warn('TokenLens: catalog fetch failed, using default catalog', err)
      return // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ['tokenlens-catalog'],
  { revalidate: 24 * 60 * 60 }, // 24 hours
)

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      })
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(' > Resumable streams are disabled due to missing REDIS_URL')
      } else {
        console.error(error)
      }
    }
  }

  return globalStreamContext
}

export async function POST(request: Request) {
  console.log('[CHAT API] POST request received')
  let requestBody: PostRequestBody

  try {
    const json = await request.json()
    console.log('[CHAT API] Request body parsed:', { hasMessage: !!json.message, id: json.id })
    requestBody = postRequestBodySchema.parse(json)
    console.log('[CHAT API] Request body validated')
  } catch (error) {
    console.error('[CHAT API] Failed to parse request body:', error)
    return new ChatSDKError('bad_request:api').toResponse()
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string
      message: ChatMessage
      selectedChatModel: ChatModel['id']
      selectedVisibilityType: VisibilityType
    } = requestBody

    console.log('[CHAT API] Getting user session...')
    const session = await auth()
    const userId = session?.user?.id || 'guest'
    console.log('[CHAT API] User:', userId)

    // Force guest users to use public visibility
    const visibilityType: VisibilityType = !session?.user ? 'public' : selectedVisibilityType
    if (!session?.user && selectedVisibilityType === 'private') {
      console.log('[CHAT API] Guest user detected, forcing public visibility')
    }

    if (session?.user) {
      console.log('[CHAT API] Checking message count for user:', session.user.id)
      const messageCount = await getMessageCountByUserId({
        id: session.user.id,
        differenceInHours: 24,
      })
      console.log('[CHAT API] Message count:', messageCount)

      if (messageCount > entitlementsByUserType['regular'].maxMessagesPerDay) {
        console.error('[CHAT API] Rate limit exceeded:', messageCount)
        return new ChatSDKError('rate_limit:chat').toResponse()
      }
    }

    console.log('[CHAT API] Getting chat by ID:', id)
    const chat = await getChatById({ id })
    let messagesFromDb: DBMessage[] = []

    if (chat) {
      console.log('[CHAT API] Chat found, userId:', chat.userId)
      if (session?.user && chat.userId !== session.user.id) {
        console.error('[CHAT API] User does not own this chat')
        return new ChatSDKError('forbidden:chat').toResponse()
      }
      // Only fetch messages if chat already exists
      console.log('[CHAT API] Fetching messages for chat:', id)
      messagesFromDb = await getMessagesByChatId({ id })
      console.log('[CHAT API] Messages fetched:', messagesFromDb.length)
    } else {
      console.log('[CHAT API] New chat, generating title...')
      const title = await generateTitleFromUserMessage({
        message,
      })
      console.log('[CHAT API] Title generated:', title)

      console.log('[CHAT API] Saving new chat...')
      await saveChat({
        id,
        userId: userId,
        title,
        visibility: visibilityType,
      })
      console.log('[CHAT API] New chat saved')
      // New chat - no need to fetch messages, it's empty
    }

    const uiMessages = [...convertToUIMessages(messagesFromDb), message]

    const { city, country } = geolocation(request)

    const requestHints: RequestHints = {
      city,
      country,
    }

    console.log('[CHAT API] Saving user message:', message.id)
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    })
    console.log('[CHAT API] User message saved')

    const streamId = generateUUID()
    console.log('[CHAT API] Creating stream ID:', streamId)
    await createStreamId({ streamId, chatId: id })
    console.log('[CHAT API] Stream ID created')

    let finalMergedUsage: AppUsage | undefined

    console.log('[CHAT API] Creating UI message stream with model:', selectedChatModel)
    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        console.log('[CHAT API] Starting streamText...')
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(uiMessages),
          temperature: 0.3, // Lower temperature (0-1) reduces hallucinations, increases factual accuracy
          stopWhen: stepCountIs(5),
          experimental_activeTools: ['searchProducts'],
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            searchProducts,
          },
          onFinish: async ({ usage }) => {
            console.log('[CHAT API] Stream finished, processing usage:', usage)
            try {
              const providers = await getTokenlensCatalog()
              const modelId = myProvider.languageModel(selectedChatModel).modelId
              if (!modelId) {
                finalMergedUsage = usage
                dataStream.write({
                  type: 'data-usage',
                  data: finalMergedUsage,
                })
                return
              }

              if (!providers) {
                finalMergedUsage = usage
                dataStream.write({
                  type: 'data-usage',
                  data: finalMergedUsage,
                })
                return
              }

              const summary = getUsage({ modelId, usage, providers })
              finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage
              dataStream.write({ type: 'data-usage', data: finalMergedUsage })
            } catch (err) {
              console.warn('TokenLens enrichment failed', err)
              finalMergedUsage = usage
              dataStream.write({ type: 'data-usage', data: finalMergedUsage })
            }
          },
        })

        result.consumeStream()

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        )
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        console.log('[CHAT API] Stream complete, saving', messages.length, 'messages')
        await saveMessages({
          messages: messages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        })

        console.log('[CHAT API] Messages saved successfully')
        if (finalMergedUsage) {
          try {
            console.log('[CHAT API] Updating chat context with usage')
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            })
            console.log('[CHAT API] Chat context updated')
          } catch (err) {
            console.warn('[CHAT API] Unable to persist last usage for chat', id, err)
          }
        }
      },
      onError: () => {
        return 'Oops, an error occurred!'
      },
    })

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    console.log('[CHAT API] Returning stream response')
    return new Response(stream.pipeThrough(new JsonToSseTransformStream()))
  } catch (error) {
    const vercelId = request.headers.get('x-vercel-id')
    console.error('[CHAT API] ERROR caught in main try-catch:', error)
    console.error(
      '[CHAT API] Error stack:',
      error instanceof Error ? error.stack : 'No stack trace',
    )

    if (error instanceof ChatSDKError) {
      console.error('[CHAT API] ChatSDKError:', error.message)
      return error.toResponse()
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes('AI Gateway requires a valid credit card on file to service requests')
    ) {
      console.error('[CHAT API] AI Gateway credit card error')
      return new ChatSDKError('bad_request:activate_gateway').toResponse()
    }

    console.error('[CHAT API] Unhandled error in chat API:', error, { vercelId })
    return new ChatSDKError('offline:chat').toResponse()
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return new ChatSDKError('bad_request:api').toResponse()
  }

  const session = await auth()

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse()
  }

  const chat = await getChatById({ id })

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse()
  }

  const deletedChat = await deleteChatById({ id })

  return Response.json(deletedChat, { status: 200 })
}
