import { google } from '@ai-sdk/google'
import { customProvider } from 'ai'

export const myProvider = customProvider({
  languageModels: {
    'gemini-flash': google('gemini-2.5-flash'),
    'gemini-pro': google('gemini-2.5-flash'),
    'title-model': google('gemini-2.5-flash'),
    'artifact-model': google('gemini-2.5-flash'),
  },
})
