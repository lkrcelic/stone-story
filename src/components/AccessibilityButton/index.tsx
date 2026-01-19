'use client'

import type { FontSize, FontType, ImageFilter, LinkStyle } from '@/providers/Font'
import {
  fontLocalStorageKey,
  fontSizeLocalStorageKey,
  imageFilterLocalStorageKey,
  linkStyleLocalStorageKey,
  useFont,
} from '@/providers/Font'
import { useTheme } from '@/providers/Theme'
import { themeLocalStorageKey } from '@/providers/Theme/shared'
import Image from 'next/image'
import React, { useState } from 'react'

export const AccessibilityButton: React.FC = () => {
  const { setTheme } = useTheme()
  const { setFont, setFontSize, setLinkStyle, setImageFilter } = useFont()
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light')
  const [currentFont, setCurrentFont] = useState<FontType>('normal')
  const [currentFontSize, setCurrentFontSize] = useState<FontSize>('normal')
  const [currentLinkStyle, setCurrentLinkStyle] = useState<LinkStyle>('normal')
  const [currentImageFilter, setCurrentImageFilter] = useState<ImageFilter>('normal')
  const [isOpen, setIsOpen] = useState(false)

  React.useEffect(() => {
    const themePreference = window.localStorage.getItem(themeLocalStorageKey)
    setCurrentTheme((themePreference as 'light' | 'dark') || 'light')

    const fontPreference = window.localStorage.getItem(fontLocalStorageKey) as FontType
    setCurrentFont(fontPreference || 'normal')

    const fontSizePreference = window.localStorage.getItem(fontSizeLocalStorageKey) as FontSize
    setCurrentFontSize(fontSizePreference || 'normal')

    const linkStylePreference = window.localStorage.getItem(linkStyleLocalStorageKey) as LinkStyle
    setCurrentLinkStyle(linkStylePreference || 'normal')

    const imageFilterPreference = window.localStorage.getItem(
      imageFilterLocalStorageKey,
    ) as ImageFilter
    setCurrentImageFilter(imageFilterPreference || 'normal')
  }, [])

  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    setCurrentTheme(newTheme)
  }

  const toggleFont = () => {
    const newFont: FontType = currentFont === 'normal' ? 'dyslexic' : 'normal'
    setFont(newFont)
    setCurrentFont(newFont)
  }

  const toggleFontSize = () => {
    const newSize: FontSize = currentFontSize === 'normal' ? 'large' : 'normal'
    setFontSize(newSize)
    setCurrentFontSize(newSize)
  }

  const toggleLinkStyle = () => {
    const newStyle: LinkStyle = currentLinkStyle === 'normal' ? 'highlight' : 'normal'
    setLinkStyle(newStyle)
    setCurrentLinkStyle(newStyle)
  }

  const toggleImageFilter = () => {
    const newFilter: ImageFilter = currentImageFilter === 'normal' ? 'grayscale' : 'normal'
    setImageFilter(newFilter)
    setCurrentImageFilter(newFilter)
  }

  return (
    <div className="fixed top-20 right-4 z-50">
      <button
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center"
        aria-label="Accessibility options"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Image
          src="/accessibility.png"
          alt=""
          width={46}
          height={46}
          aria-hidden="true"
          className="invert dark:invert-0"
        />
      </button>
      {isOpen && (
        <div className="absolute top-14 right-0 bg-background border border-border rounded-lg shadow-lg p-3 min-w-[160px] flex flex-col gap-2">
          <button
            className="w-full px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2"
            aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
            type="button"
            onClick={toggleTheme}
          >
            {currentTheme === 'light' ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
                <span className="text-sm font-medium">Dark</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
                <span className="text-sm font-medium">Light</span>
              </>
            )}
          </button>
          <button
            className="w-full px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2"
            aria-label={`Switch to ${currentFont === 'normal' ? 'dyslexic' : 'normal'} font`}
            type="button"
            onClick={toggleFont}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 7V4h16v3" />
              <path d="M9 20h6" />
              <path d="M12 4v16" />
            </svg>
            <span className="text-sm font-medium">
              {currentFont === 'normal' ? 'Dyslexic' : 'Normal'}
            </span>
          </button>
          <button
            className="w-full px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2"
            aria-label={`Switch to ${currentFontSize === 'normal' ? 'large' : 'normal'} font size`}
            type="button"
            onClick={toggleFontSize}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7V6a2 2 0 0 1 2-2h2" />
              <path d="M17 4h2a2 2 0 0 1 2 2v1" />
              <path d="M21 17v1a2 2 0 0 1-2 2h-2" />
              <path d="M7 20H5a2 2 0 0 1-2-2v-1" />
              <path d="M7 8h10" />
              <path d="M12 8v8" />
              <path d="M9 16h6" />
            </svg>
            <span className="text-sm font-medium">
              {currentFontSize === 'normal' ? 'Large' : 'Normal'}
            </span>
          </button>
          <button
            className="w-full px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2"
            aria-label={`Switch to ${currentLinkStyle === 'normal' ? 'highlighted' : 'normal'} links`}
            type="button"
            onClick={toggleLinkStyle}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className="text-sm font-medium">
              {currentLinkStyle === 'normal' ? 'Highlight' : 'Normal'}
            </span>
          </button>
          <button
            className="w-full px-4 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2"
            aria-label={`Switch to ${currentImageFilter === 'normal' ? 'grayscale' : 'normal'} images`}
            type="button"
            onClick={toggleImageFilter}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <span className="text-sm font-medium">
              {currentImageFilter === 'normal' ? 'Grayscale' : 'Normal'}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
