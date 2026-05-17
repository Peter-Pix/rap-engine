'use client'

// Client wrapper pro Contentlayer MDX rendering
// useMDXComponent obsahuje React hooks (useMemo), musí běžet na klientovi
// Ale rendered HTML je stále součást SSR streamu — Google bot ho dostane

import { useMDXComponent } from 'next-contentlayer2/hooks'
import { useMemo } from 'react'
import Link from 'next/link'
import { ENTITY_REGISTRY } from '@/lib/interlinking'

// MDX custom komponenty pro auto-interlinking
const mdxComponents = {
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const href = props.href || ''
    if (href.startsWith('/')) {
      return <Link href={href} {...props} />
    }
    return <a {...props} target="_blank" rel="noopener noreferrer" />
  },
  // Wrap paragrafy do entity-link autodetekce (Fáze 3 hook)
}

interface MDXRendererProps {
  code: string
}

export function MDXRenderer({ code }: MDXRendererProps) {
  const Component = useMDXComponent(code)
  return <Component components={mdxComponents} />
}
