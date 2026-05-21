import Link from 'next/link'
import { getBreadcrumbSchema } from '@/lib/schema'
import { JsonLd } from '@/components/seo/JsonLd'

interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumb({ items, currentUrl }: { items: BreadcrumbItem[]; currentUrl?: string }) {
  const BASE = 'https://4rap.cz'
  // Pro Schema.org: každá položka musí mít vlastní URL
  const schemaItems = items.map((item, idx) => {
    const isLast = idx === items.length - 1
    let url: string
    if (item.href) url = `${BASE}${item.href}`
    else if (isLast && currentUrl) url = currentUrl
    else url = BASE
    return { name: item.label, url }
  })

  return (
    <>
      <JsonLd data={getBreadcrumbSchema(schemaItems)} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-600 font-mono">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <span key={index} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-zinc-700">/</span>}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-zinc-400 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-zinc-400' : ''}>{item.label}</span>
              )}
            </span>
          )
        })}
      </nav>
    </>
  )
}
