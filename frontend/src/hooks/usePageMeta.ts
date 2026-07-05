import { useEffect, useRef } from 'react'

const BASE_TITLE = 'SITE - CBTis No. 61'
const BASE_URL = 'https://site-cbtis61.example.com'
const DEFAULT_DESCRIPTION =
  'Sistema Integral de Talleres Escolares del CBTis No. 61. Descubre talleres culturales, cívicos y deportivos.'

interface PageMeta {
  title?: string
  description?: string
  canonicalPath?: string
  ogImage?: string
  noindex?: boolean
}

function setMetaTag(id: string, nameOrProperty: string, content: string, attrName: 'name' | 'property') {
  let el = document.getElementById(id) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.id = id
    el.setAttribute(attrName, nameOrProperty)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setLinkTag(id: string, rel: string, href: string) {
  let el = document.getElementById(id) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.id = id
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function removeMetaTag(id: string) {
  const el = document.getElementById(id)
  if (el) el.remove()
}

export function usePageMeta({
  title,
  description,
  canonicalPath,
  ogImage,
  noindex = false,
}: PageMeta = {}) {
  const previousTitle = useRef<string | null>(null)

  useEffect(() => {
    const previous = document.title
    previousTitle.current = previous

    const fullTitle = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE}`
    document.title = fullTitle

    const desc = description || DEFAULT_DESCRIPTION

    setMetaTag('meta-description', 'description', desc, 'name')
    setMetaTag('og-title', 'og:title', fullTitle, 'property')
    setMetaTag('og-description', 'og:description', desc, 'property')
    setMetaTag('twitter-title', 'twitter:title', fullTitle, 'name')
    setMetaTag('twitter-description', 'twitter:description', desc, 'name')

    if (ogImage) {
      setMetaTag('og-image', 'og:image', ogImage, 'property')
      setMetaTag('twitter-image', 'twitter:image', ogImage, 'name')
    } else {
      removeMetaTag('og-image')
      removeMetaTag('twitter-image')
    }

    if (canonicalPath) {
      setLinkTag('canonical-link', 'canonical', `${BASE_URL}${canonicalPath}`)
      const ogUrl = document.getElementById('og-url') as HTMLMetaElement | null
      if (!ogUrl) {
        const el = document.createElement('meta')
        el.id = 'og-url'
        el.setAttribute('property', 'og:url')
        document.head.appendChild(el)
        el.setAttribute('content', `${BASE_URL}${canonicalPath}`)
      } else {
        ogUrl.setAttribute('content', `${BASE_URL}${canonicalPath}`)
      }
    }

    const robots = noindex ? 'noindex, nofollow' : 'index, follow'
    setMetaTag('meta-robots', 'robots', robots, 'name')

    return () => {
      if (previous !== null) {
        document.title = previous
      }
    }
  }, [title, description, canonicalPath, ogImage, noindex])
}
