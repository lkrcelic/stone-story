import type { ArtifactKind } from '@/components/ChatBot/artifact'
import type { InferUITool, UIMessage } from 'ai'
import { z } from 'zod'
import { searchProducts } from './ai/tools/search-products'
import type { Suggestion } from './db/types'
import type { AppUsage } from './usage'

export type DataPart = { type: 'append-message'; message: string }

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
})

export type MessageMetadata = z.infer<typeof messageMetadataSchema>

type searchProductsTool = InferUITool<typeof searchProducts>

export type ChatTools = {
  searchProducts: searchProductsTool
}

export type CustomUIDataTypes = {
  textDelta: string
  imageDelta: string
  sheetDelta: string
  codeDelta: string
  suggestion: Suggestion
  appendMessage: string
  id: string
  title: string
  kind: ArtifactKind
  clear: null
  finish: null
  usage: AppUsage
}

export type ChatMessage = UIMessage<MessageMetadata, CustomUIDataTypes, ChatTools>

export type Attachment = {
  name: string
  url: string
  contentType: string
}
