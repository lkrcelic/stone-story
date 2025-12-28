'use client'

import {
  fontLocalStorageKey,
  fontSizeLocalStorageKey,
  linkStyleLocalStorageKey,
} from '@/providers/Font'
import Script from 'next/script'

export const InitFont = () => {
  const script = `
    (function() {
      try {
        var font = localStorage.getItem('${fontLocalStorageKey}');
        if (font) {
          document.documentElement.setAttribute('data-font', font);
        }
        var fontSize = localStorage.getItem('${fontSizeLocalStorageKey}');
        if (fontSize) {
          document.documentElement.setAttribute('data-font-size', fontSize);
        }
        var linkStyle = localStorage.getItem('${linkStyleLocalStorageKey}');
        if (linkStyle) {
          document.documentElement.setAttribute('data-link-style', linkStyle);
        }
      } catch (e) {}
    })();
  `

  return <Script dangerouslySetInnerHTML={{ __html: script }} strategy="beforeInteractive" />
}
