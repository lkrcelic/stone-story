import type { UserType } from '@/lib/payload-auth'
import type { ChatModel } from './models'

type Entitlements = {
  maxMessagesPerDay: number
  availableChatModelIds: ChatModel['id'][]
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: ['gemini-flash'],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: ['gemini-flash'],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
}
