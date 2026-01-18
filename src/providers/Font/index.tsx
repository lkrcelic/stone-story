'use client'

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type FontType = 'normal' | 'dyslexic'
export type FontSize = 'normal' | 'large'
export type LinkStyle = 'normal' | 'highlight'
export type ImageFilter = 'normal' | 'grayscale'

export const fontLocalStorageKey = 'font-type'
export const fontSizeLocalStorageKey = 'font-size'
export const linkStyleLocalStorageKey = 'link-style'
export const imageFilterLocalStorageKey = 'image-filter'

interface FontContextType {
  font: FontType | null
  setFont: (font: FontType | null) => void
  fontSize: FontSize | null
  setFontSize: (size: FontSize | null) => void
  linkStyle: LinkStyle | null
  setLinkStyle: (style: LinkStyle | null) => void
  imageFilter: ImageFilter | null
  setImageFilter: (filter: ImageFilter | null) => void
}

const FontContext = createContext<FontContextType | undefined>(undefined)

export const useFont = (): FontContextType => {
  const context = useContext(FontContext)
  if (!context) {
    throw new Error('useFont must be used within FontProvider')
  }
  return context
}

export const FontProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [font, setFontState] = useState<FontType | null>(null)
  const [fontSize, setFontSizeState] = useState<FontSize | null>(null)
  const [linkStyle, setLinkStyleState] = useState<LinkStyle | null>(null)
  const [imageFilter, setImageFilterState] = useState<ImageFilter | null>(null)

  useEffect(() => {
    const storedFont = window.localStorage.getItem(fontLocalStorageKey) as FontType | null
    if (storedFont) {
      setFontState(storedFont)
      document.documentElement.setAttribute('data-font', storedFont)
    }

    const storedFontSize = window.localStorage.getItem(fontSizeLocalStorageKey) as FontSize | null
    if (storedFontSize) {
      setFontSizeState(storedFontSize)
      document.documentElement.setAttribute('data-font-size', storedFontSize)
    }

    const storedLinkStyle = window.localStorage.getItem(
      linkStyleLocalStorageKey,
    ) as LinkStyle | null
    if (storedLinkStyle) {
      setLinkStyleState(storedLinkStyle)
      document.documentElement.setAttribute('data-link-style', storedLinkStyle)
    }

    const storedImageFilter = window.localStorage.getItem(
      imageFilterLocalStorageKey,
    ) as ImageFilter | null
    if (storedImageFilter) {
      setImageFilterState(storedImageFilter)
      document.documentElement.setAttribute('data-image-filter', storedImageFilter)
    }
  }, [])

  const setFont = useCallback((fontToSet: FontType | null) => {
    if (fontToSet === null) {
      window.localStorage.removeItem(fontLocalStorageKey)
      document.documentElement.removeAttribute('data-font')
      setFontState(null)
    } else {
      setFontState(fontToSet)
      window.localStorage.setItem(fontLocalStorageKey, fontToSet)
      document.documentElement.setAttribute('data-font', fontToSet)
    }
  }, [])

  const setFontSize = useCallback((sizeToSet: FontSize | null) => {
    if (sizeToSet === null) {
      window.localStorage.removeItem(fontSizeLocalStorageKey)
      document.documentElement.removeAttribute('data-font-size')
      setFontSizeState(null)
    } else {
      setFontSizeState(sizeToSet)
      window.localStorage.setItem(fontSizeLocalStorageKey, sizeToSet)
      document.documentElement.setAttribute('data-font-size', sizeToSet)
    }
  }, [])

  const setLinkStyle = useCallback((styleToSet: LinkStyle | null) => {
    if (styleToSet === null) {
      window.localStorage.removeItem(linkStyleLocalStorageKey)
      document.documentElement.removeAttribute('data-link-style')
      setLinkStyleState(null)
    } else {
      setLinkStyleState(styleToSet)
      window.localStorage.setItem(linkStyleLocalStorageKey, styleToSet)
      document.documentElement.setAttribute('data-link-style', styleToSet)
    }
  }, [])

  const setImageFilter = useCallback((filterToSet: ImageFilter | null) => {
    if (filterToSet === null) {
      window.localStorage.removeItem(imageFilterLocalStorageKey)
      document.documentElement.removeAttribute('data-image-filter')
      setImageFilterState(null)
    } else {
      setImageFilterState(filterToSet)
      window.localStorage.setItem(imageFilterLocalStorageKey, filterToSet)
      document.documentElement.setAttribute('data-image-filter', filterToSet)
    }
  }, [])

  return (
    <FontContext.Provider
      value={{
        font,
        setFont,
        fontSize,
        setFontSize,
        linkStyle,
        setLinkStyle,
        imageFilter,
        setImageFilter,
      }}
    >
      {children}
    </FontContext.Provider>
  )
}
