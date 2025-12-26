import 'server-only'

import type { ArtifactKind } from '@/components/ChatBot/artifact'
import type { VisibilityType } from '@/components/ChatBot/visibility-selector'
import { ChatSDKError } from '../errors'
import type { AppUsage } from '../usage'
import { generateUUID } from '../utils'
import { getPayloadDb } from './client'
import type { DBMessage, Suggestion, User } from './types'
import { generateHashedPassword } from './utils'

// Helper to execute SQL queries using Payload's database
async function query(sqlQuery: string, params: any[] = []) {
  const payload = await getPayloadDb()
  const db = payload.db as any

  // The pool is available at db.pool for @payloadcms/db-postgres
  const pool = db.pool

  if (!pool) {
    console.error('Database structure:', Object.keys(db))
    throw new Error('Database pool not available. Available keys: ' + Object.keys(db).join(', '))
  }

  // Use the PostgreSQL pool directly for parameterized queries
  const result = await pool.query(sqlQuery, params)
  return result
}

export async function getUser(email: string): Promise<User[]> {
  try {
    const result = await query(`SELECT * FROM "User" WHERE email = $1`, [email])
    return result.rows || []
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user by email')
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password)

  try {
    return await query(`INSERT INTO "User" (email, password) VALUES ($1, $2)`, [
      email,
      hashedPassword,
    ])
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user')
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`
  const password = generateHashedPassword(generateUUID())

  try {
    const result = await query(
      `INSERT INTO "User" (email, password) VALUES ($1, $2) RETURNING id, email`,
      [email, password],
    )
    return result.rows?.[0]
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create guest user')
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string
  userId: string
  title: string
  visibility: VisibilityType
}) {
  try {
    return await query(
      `INSERT INTO "Chat" (id, "createdAt", title, "userId", visibility) VALUES ($1, NOW(), $2, $3, $4)`,
      [id, title, userId, visibility],
    )
  } catch (error) {
    console.error('Failed to save chat:', error)
    throw new ChatSDKError('bad_request:database', 'Failed to save chat')
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await query(`DELETE FROM "Vote_v2" WHERE "chatId" = $1`, [id])
    await query(`DELETE FROM "Message_v2" WHERE "chatId" = $1`, [id])
    await query(`DELETE FROM "Stream" WHERE "chatId" = $1`, [id])

    const result = await query(`DELETE FROM "Chat" WHERE id = $1 RETURNING *`, [id])
    return result.rows?.[0]
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete chat by id')
  }
}

export async function deleteAllChatsByUserId({ userId }: { userId: string }) {
  try {
    const userChats = await query(`SELECT id FROM "Chat" WHERE "userId" = $1`, [userId])

    if (!userChats.rows || userChats.rows.length === 0) {
      return { deletedCount: 0 }
    }

    const chatIds = userChats.rows.map((c: any) => c.id)
    const placeholders = chatIds.map((_: any, i: number) => `$${i + 1}`).join(', ')

    await query(`DELETE FROM "Vote_v2" WHERE "chatId" IN (${placeholders})`, chatIds)
    await query(`DELETE FROM "Message_v2" WHERE "chatId" IN (${placeholders})`, chatIds)
    await query(`DELETE FROM "Stream" WHERE "chatId" IN (${placeholders})`, chatIds)
    await query(`DELETE FROM "Chat" WHERE "userId" = $1`, [userId])

    return { deletedCount: chatIds.length }
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete all chats by user id')
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string
  limit: number
  startingAfter: string | null
  endingBefore: string | null
}) {
  try {
    let sqlQuery = `SELECT * FROM "Chat" WHERE "userId" = $1`
    const params: any[] = [id]

    if (startingAfter) {
      sqlQuery += ` AND "createdAt" < (SELECT "createdAt" FROM "Chat" WHERE id = $2)`
      params.push(startingAfter)
    } else if (endingBefore) {
      sqlQuery += ` AND "createdAt" > (SELECT "createdAt" FROM "Chat" WHERE id = $2)`
      params.push(endingBefore)
    }

    sqlQuery += ` ORDER BY "createdAt" DESC LIMIT $${params.length + 1}`
    params.push(limit + 1)

    const result = await query(sqlQuery, params)
    const chats = result.rows || []
    const hasMore = chats.length > limit

    return {
      chats: hasMore ? chats.slice(0, limit) : chats,
      hasMore,
    }
  } catch (error) {
    console.error('Failed to get chats by user id:', error)
    throw new ChatSDKError('bad_request:database', 'Failed to get chats by user id')
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const result = await query(`SELECT * FROM "Chat" WHERE id = $1`, [id])
    return result.rows?.[0] || null
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id')
  }
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
  try {
    const values = messages
      .map((_, idx) => {
        const offset = idx * 6
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
      })
      .join(', ')

    const params = messages.flatMap((msg) => [
      msg.id,
      msg.chatId,
      msg.role,
      JSON.stringify(msg.parts),
      JSON.stringify(msg.attachments),
      msg.createdAt,
    ])

    return await query(
      `INSERT INTO "Message_v2" (id, "chatId", role, parts, attachments, "createdAt") VALUES ${values}`,
      params,
    )
  } catch (error) {
    console.error('Failed to save messages:', error)
    throw new ChatSDKError('bad_request:database', 'Failed to save messages')
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const result = await query(
      `SELECT * FROM "Message_v2" WHERE "chatId" = $1 ORDER BY "createdAt" ASC`,
      [id],
    )
    return result.rows || []
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get messages by chat id')
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string
  messageId: string
  type: 'up' | 'down'
}) {
  try {
    const isUpvoted = type === 'up'

    const existing = await query(`SELECT * FROM "Vote_v2" WHERE "messageId" = $1`, [messageId])

    if (existing.rows && existing.rows.length > 0) {
      return await query(
        `UPDATE "Vote_v2" SET "isUpvoted" = $1 WHERE "messageId" = $2 AND "chatId" = $3`,
        [isUpvoted, messageId, chatId],
      )
    } else {
      return await query(
        `INSERT INTO "Vote_v2" ("chatId", "messageId", "isUpvoted") VALUES ($1, $2, $3)`,
        [chatId, messageId, isUpvoted],
      )
    }
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message')
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    const result = await query(`SELECT * FROM "Vote_v2" WHERE "chatId" = $1`, [id])
    return result.rows || []
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get votes by chat id')
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string
  title: string
  kind: ArtifactKind
  content: string
  userId: string
}) {
  try {
    return await query(
      `INSERT INTO "Document" (id, title, text, content, "userId", "createdAt") VALUES ($1, $2, $3, $4, $5, NOW())`,
      [id, title, kind, content, userId],
    )
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document')
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const result = await query(`SELECT * FROM "Document" WHERE id = $1 ORDER BY "createdAt" ASC`, [
      id,
    ])
    return result.rows || []
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get documents by id')
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const result = await query(
      `SELECT * FROM "Document" WHERE id = $1 ORDER BY "createdAt" DESC LIMIT 1`,
      [id],
    )
    return result.rows?.[0]
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get document by id')
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string
  timestamp: Date
}) {
  try {
    await query(`DELETE FROM "Suggestion" WHERE "documentId" = $1 AND "documentCreatedAt" > $2`, [
      id,
      timestamp,
    ])

    const result = await query(
      `DELETE FROM "Document" WHERE id = $1 AND "createdAt" > $2 RETURNING *`,
      [id, timestamp],
    )
    return result.rows || []
  } catch (_error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    )
  }
}

export async function saveSuggestions({ suggestions }: { suggestions: Suggestion[] }) {
  try {
    const values = suggestions
      .map((_, idx) => {
        const offset = idx * 8
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      })
      .join(', ')

    const params = suggestions.flatMap((sug) => [
      sug.id,
      sug.documentId,
      sug.documentCreatedAt,
      sug.originalText,
      sug.suggestedText,
      sug.description,
      sug.isResolved,
      sug.userId,
      sug.createdAt,
    ])

    return await query(
      `INSERT INTO "Suggestion" (id, "documentId", "documentCreatedAt", "originalText", "suggestedText", description, "isResolved", "userId", "createdAt") VALUES ${values}`,
      params,
    )
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save suggestions')
  }
}

export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }) {
  try {
    const result = await query(`SELECT * FROM "Suggestion" WHERE "documentId" = $1`, [documentId])
    return result.rows || []
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get suggestions by document id')
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const result = await query(`SELECT * FROM "Message_v2" WHERE id = $1`, [id])
    return result.rows || []
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message by id')
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string
  timestamp: Date
}) {
  try {
    const messagesToDelete = await query(
      `SELECT id FROM "Message_v2" WHERE "chatId" = $1 AND "createdAt" >= $2`,
      [chatId, timestamp],
    )

    const messageIds = messagesToDelete.rows?.map((msg: any) => msg.id) || []

    if (messageIds.length > 0) {
      const placeholders = messageIds.map((_: any, i: number) => `$${i + 1}`).join(', ')
      await query(
        `DELETE FROM "Vote_v2" WHERE "chatId" = $1 AND "messageId" IN (${placeholders})`,
        [chatId, ...messageIds],
      )

      await query(`DELETE FROM "Message_v2" WHERE "chatId" = $1 AND "createdAt" >= $2`, [
        chatId,
        timestamp,
      ])
    }
  } catch (_error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    )
  }
}

export async function updateChatVisibilityById({
  chatId,
  visibility,
}: {
  chatId: string
  visibility: 'private' | 'public'
}) {
  try {
    return await query(`UPDATE "Chat" SET visibility = $1 WHERE id = $2`, [visibility, chatId])
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to update chat visibility by id')
  }
}

export async function updateChatLastContextById({
  chatId,
  context,
}: {
  chatId: string
  context: AppUsage
}) {
  try {
    return await query(`UPDATE "Chat" SET "lastContext" = $1 WHERE id = $2`, [
      JSON.stringify(context),
      chatId,
    ])
  } catch (error) {
    console.warn('Failed to update lastContext for chat', chatId, error)
    return
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string
  differenceInHours: number
}) {
  try {
    const result = await query(
      `SELECT COUNT(m.id) as count 
       FROM "Message_v2" m
       INNER JOIN "Chat" c ON m."chatId" = c.id
       WHERE c."userId" = $1 
       AND m."createdAt" >= NOW() - INTERVAL '${differenceInHours} hours'`,
      [id],
    )

    return result.rows?.[0]?.count ?? 0
  } catch (error) {
    console.error('Failed to get message count by user id:', error)
    throw new ChatSDKError('bad_request:database', 'Failed to get message count by user id')
  }
}

export async function createStreamId({ streamId, chatId }: { streamId: string; chatId: string }) {
  try {
    await query(`INSERT INTO "Stream" (id, "chatId", "createdAt") VALUES ($1, $2, NOW())`, [
      streamId,
      chatId,
    ])
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create stream id')
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const result = await query(
      `SELECT id FROM "Stream" WHERE "chatId" = $1 ORDER BY "createdAt" ASC`,
      [chatId],
    )

    return result.rows?.map((row: any) => row.id) || []
  } catch (_error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get stream ids by chat id')
  }
}
