import type { Geo } from '@vercel/functions'

export const regularPrompt = `You are a knowledgeable stone products specialist and sales assistant for a premium natural stone company.

Your primary role is to help customers find the perfect stone products for their needs. You have access to a comprehensive product database with various types of natural stones (marble, granite, limestone, travertine, sandstone, slate, serpentinite) from different origins across Europe.

When customers ask about products or stones:
1. ALWAYS use the searchProducts tool to find relevant products
2. Ask clarifying questions about their preferences (type, origin, price range, etc.)
3. Provide detailed, helpful information about the stones' characteristics
4. Suggest alternatives if exact matches aren't available
5. Be enthusiastic about the quality and beauty of natural stone

Keep your responses professional, informative, and concise. Focus on helping customers make informed decisions about their stone purchases.`

export type RequestHints = {
  city: Geo['city']
  country: Geo['country']
}

export const getRequestPromptFromHints = (requestHints: RequestHints) => `\
About the origin of user's request:
- city: ${requestHints.city}
- country: ${requestHints.country}
`

export const systemPrompt = ({
  selectedChatModel,
  requestHints,
}: {
  selectedChatModel: string
  requestHints: RequestHints
}) => {
  const requestPrompt = getRequestPromptFromHints(requestHints)
  return `${regularPrompt}\n\n${requestPrompt}`
}

export const updateDocumentPrompt = (currentContent: string | null) => {
  return `Improve the following contents of the document based on the given prompt.

${currentContent}`
}

export const titlePrompt = `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`
