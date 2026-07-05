interface StructuredDataProps {
  type: 'Organization' | 'WebSite' | 'BreadcrumbList' | 'FAQPage'
  data?: Record<string, unknown>
}

const defaultOrganization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CBTis No. 61',
  alternateName: 'SITE - Sistema Integral de Talleres Escolares',
  url: 'https://site-cbtis61.example.com',
  description:
    'Centro de Bachillerato Tecnológico Industrial y de Servicios No. 61. Ofrecemos talleres culturales, cívicos y deportivos para la formación integral de nuestros estudiantes.',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'MX',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['Spanish'],
  },
}

const defaultWebSite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SITE - CBTis No. 61',
  url: 'https://site-cbtis61.example.com',
  description:
    'Sistema Integral de Talleres Escolares del CBTis No. 61. Descubre talleres culturales, cívicos y deportivos.',
  publisher: {
    '@type': 'Organization',
    name: 'CBTis No. 61',
  },
}

export function StructuredData({ type, data }: StructuredDataProps) {
  let jsonLd: Record<string, unknown>

  switch (type) {
    case 'WebSite':
      jsonLd = { ...defaultWebSite, ...data }
      break
    case 'Organization':
    default:
      jsonLd = { ...defaultOrganization, ...data }
      break
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
