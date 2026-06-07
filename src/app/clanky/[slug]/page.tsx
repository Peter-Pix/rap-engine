import { allClaneks } from 'contentlayer/generated'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MDXRenderer } from '@/components/entity/MDXRenderer'
import { JsonLd } from '@/components/seo/JsonLd'
import { CategoryBadge } from '@/components/magazine/CategoryBadge'
import { TagList } from '@/components/magazine/TagPill'
import { ArticleCard } from '@/components/magazine/ArticleCard'
import { toListItem, formatCzechDate } from '@/lib/magazine'
import type { Metadata } from 'next'

export async function generateStaticParams() {
  return allClaneks.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const article = allClaneks.find((c) => c.slug === slug)
  if (!article) return {}
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: article.canonicalUrl },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      publishedTime: article.publishedAt,
      authors: article.author ? [article.author] : undefined,
      tags: article.tags,
      url: article.canonicalUrl,
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const article = allClaneks.find((c) => c.slug === slug)
  if (!article) notFound()

  // Related: stejná kategorie, nedávné, excluding tenhle
  const related = allClaneks
    .filter((c) => c.slug !== article.slug && c.category === article.category)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3)
    .map(toListItem)

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: article.canonicalUrl,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    ...(article.author && { author: { '@type': 'Person', name: article.author } }),
    publisher: { '@type': 'Organization', name: '4rap.cz', url: 'https://4rap.cz' },
    keywords: article.tags?.join(', '),
  }

  return (
    <>
      <JsonLd data={articleSchema} />

      <article className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Breadcrumbs */}
        <nav aria-label="Drobečková navigace" className="mb-6">
          <ol className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500 overflow-x-auto scrollbar-none whitespace-nowrap">
            <li><Link href="/" className="hover:text-zinc-300 transition-colors">4rap.cz</Link></li>
            <li aria-hidden className="text-zinc-700">/</li>
            <li><Link href="/clanky" className="hover:text-zinc-300 transition-colors">Články</Link></li>
            <li aria-hidden className="text-zinc-700">/</li>
            <li className="text-zinc-300 truncate max-w-[60vw]">{article.title}</li>
          </ol>
        </nav>

        {/* Article header */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {article.category && (
              <CategoryBadge category={article.category} />
            )}
            <time
              dateTime={article.publishedAt}
              className="text-[10px] font-mono uppercase tracking-widest text-zinc-500"
            >
              {formatCzechDate(article.publishedAt)}
            </time>
            {(article as any).readingTime && (
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                · {(article as any).readingTime} min čtení
              </span>
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-white uppercase leading-[0.95] mb-6">
            {article.title}
          </h1>

          <p className="text-lg sm:text-xl text-zinc-300 leading-relaxed mb-6">
            {article.description}
          </p>

          {article.author && (
            <p className="text-sm font-mono text-zinc-500">
              <span className="text-zinc-600 uppercase tracking-widest text-[10px]">Autor:</span>{' '}
              <span className="text-zinc-300">{article.author}</span>
            </p>
          )}
        </header>

        {/* Body */}
        <div className="rap-prose">
          <MDXRenderer code={article.body.code} />
        </div>

        {/* Tags pod článkem */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-white/10">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-3">
              Témata
            </p>
            <TagList tags={article.tags} clickable />
          </div>
        )}
      </article>

      {/* Related — full width pod hlavním sloupcem */}
      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12 sm:pb-16">
          <div className="border-t border-white/5 pt-12">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                Související
              </h2>
              <Link
                href="/clanky"
                className="text-[10px] font-mono uppercase tracking-widest text-orange-400 hover:text-orange-300 transition-colors"
              >
                Magazín →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {related.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
