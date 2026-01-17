import type { FieldHook } from 'payload'

/**
 * Extracts plain text from Lexical richText JSON structure
 */
export const extractTextFromRichText = (nodes: any): string => {
  if (!nodes) return ''

  const traverse = (node: any): string => {
    if (!node) return ''

    if (Array.isArray(node)) {
      return node.map(traverse).join(' ')
    }

    if (typeof node !== 'object') return ''

    const parts: string[] = []

    // Lexical nodes have 'text' property for text content
    if (typeof node.text === 'string') {
      parts.push(node.text)
    }

    // Traverse children recursively
    if (Array.isArray(node.children)) {
      parts.push(traverse(node.children))
    }

    // Handle root structure
    if (node.root && Array.isArray(node.root.children)) {
      parts.push(traverse(node.root.children))
    }

    return parts.join(' ')
  }

  return traverse(nodes)
}

/**
 * Field hook that populates description_search from description richText
 */
export const populateDescriptionSearch: FieldHook = ({ data, originalDoc, value }) => {
  // Use the incoming description value, or fall back to original
  const description = data?.description ?? originalDoc?.description

  if (!description) {
    return ''
  }

  const plainText = extractTextFromRichText(description)
  return plainText.trim()
}
