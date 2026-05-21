import { allClaneks } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { Breadcrumb } from '@/components/entity/Breadcrumb'
import { JsonLd } from '@/components/seo/JsonLd'
import { getArticleSchema } from '@/lib/schema'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return allClaneks.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const clanek = allClaneks.find((c) => c.slug === slug)
  if (!clanek) return {}
  return {
    title: clanek.title,
    description: clanek.description.slice(0, 155),
    alternates: { canonical: clanek.canonicalUrl },
    openGraph: {
      title: `${clanek.title} | 4rap.cz`,
      description: clanek.description,
      url: clanek.canonicalUrl,
      type: 'article',
      publishedTime: clanek.publishedAt,
      ...(clanek.updatedAt && { modifiedTime: clanek.updatedAt }),
    },
  }
}

export default async function ClanekPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const clanek = allClaneks.find((c) => c.slug === slug)
  if (!clanek) notFound()

  return (
    <>
      <JsonLd data={getArticleSchema({
        title: clanek.title, description: clanek.description, url: clanek.canonicalUrl,
        image: clanek.image, publishedAt: clanek.publishedAt, updatedAt: clanek.updatedAt, author: clanek.author,
      })} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <Breadcrumb items={[
          { label: '4rap.cz', href: '/' },
          { label: 'Články', href: '/clanky' },
          { label: clanek.title },
        ]} currentUrl={clanek.canonicalUrl} />
        
        <article className="mt-8">
          <div className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded-sm bg-[#fb923c]/10 text-[#fb923c] border border-[#fb923c]/20 mb-4">
              {clanek.category}
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-3">
              {clanek.title}
            </h1>
            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
              {clanek.author && <span>{clanek.author}</span>}
              <span>·</span>
              <time dateTime={clanek.publishedAt}>{new Date(clanek.publishedAt).toLocaleDateString('cs-CZ')}</time>
              <span>·</span>
              <span>{clanek.readingTime} min čtení</span>
            </div>
          </div>
          <div className="rap-prose">
            <MDXRenderer code={clanek.body.code} />
          </div>
        </article>
      </div>
    </>
  )
}
