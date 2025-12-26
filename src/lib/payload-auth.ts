import 'server-only'

import configPromise from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'

export type UserType = 'guest' | 'regular'

// Adapter type to match next-auth User interface
export type User = {
  id: string
  email: string | null
  name?: string | null
  image?: string | null
  userType?: UserType
}

export type PayloadSession = {
  user: User
} | null

/**
 * Get the current authenticated user from Payload
 * Returns null if no user is authenticated
 */
export async function auth(): Promise<PayloadSession> {
  try {
    const payload = await getPayload({ config: configPromise })
    const cookieStore = await cookies()
    const token = cookieStore.get('payload-token')?.value

    if (!token) {
      return null
    }

    // Verify the token and get the user
    const { user: payloadUser } = await payload.auth({
      headers: new Headers({
        Cookie: `payload-token=${token}`,
      }),
    })

    if (!payloadUser) {
      return null
    }

    // Determine user type based on whether they have an account
    const userType: UserType = payloadUser.id ? 'regular' : 'guest'

    // Convert Payload user to adapter User type
    const user: User = {
      id: String(payloadUser.id),
      email: payloadUser.email || null,
      name: payloadUser.name || null,
      image: null,
      userType,
    }

    return {
      user,
    }
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}
