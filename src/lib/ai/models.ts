export const DEFAULT_CHAT_MODEL: string = 'gemini-flash'

export type ChatModel = {
  id: string
  name: string
  description: string
}

export const chatModels: ChatModel[] = [
  {
    id: 'gemini-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast and efficient Google Gemini model with multimodal capabilities',
  },
]
