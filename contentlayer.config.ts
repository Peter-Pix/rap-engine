import { defineDocumentType, makeSource } from 'contentlayer2/source-files'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

import { remarkInterlinking } from './src/lib/remark-interlinking'
import { ENTITY_REGISTRY } from './src/lib/interlinking'

// ─── RAPPER ────────────────────────────────────────────────
export const Rapper = defineDocumentType(() => ({
  name: 'Rapper',
  filePathPattern: 'raperi/**/*.mdx',
  contentType: 'mdx',
  fields: {
    title:       { type: 'string',   required: true },
    slug:        { type: 'string',   required: true },
    realName:    { type: 'string',   required: false },
    born:        { type: 'string',   required: false },
    active:      { type: 'string',   required: false },
    label:       { type: 'string',   required: false },
    genre:       { type: 'list',     of: { type: 'string' }, required: false },
    description: { type: 'string',   required: true },
    image:       { type: 'string',   required: false },
    featured:    { type: 'boolean',  default: false },
    publishedAt: { type: 'date',     required: true },
    updatedAt:   { type: 'date',     required: false },
    relatedRappers: { type: 'list', of: { type: 'string' }, required: false },
    relatedAlbums:  { type: 'list', of: { type: 'string' }, required: false },
  },
  computedFields: {
    url:          { type: 'string', resolve: (doc) => `/raperi/${doc.slug}` },
    canonicalUrl: { type: 'string', resolve: (doc) => `https://4rap.cz/raperi/${doc.slug}` },
  },
}))

// ─── ALBUM ─────────────────────────────────────────────────
export const Album = defineDocumentType(() => ({
  name: 'Album',
  filePathPattern: 'alba/**/*.mdx',
  contentType: 'mdx',
  fields: {
    title:       { type: 'string',   required: true },
    slug:        { type: 'string',   required: true },
    rapper:      { type: 'string',   required: true },
    rapperSlug:  { type: 'string',   required: true },
    label:       { type: 'string',   required: false },
    labelSlug:   { type: 'string',   required: false },
    year:        { type: 'number',   required: true },
    genre:       { type: 'list',     of: { type: 'string' }, required: false },
    description: { type: 'string',   required: true },
    image:       { type: 'string',   required: false },
    featured:    { type: 'boolean',  default: false },      // ← ADD THIS
    tracklist:   { type: 'list',     of: { type: 'string' }, required: false },
    rating:      { type: 'number',   required: false },
    publishedAt: { type: 'date',     required: true },
    updatedAt:   { type: 'date',     required: false },
  },
  computedFields: {
    url:          { type: 'string', resolve: (doc) => `/alba/${doc.slug}` },
    canonicalUrl: { type: 'string', resolve: (doc) => `https://4rap.cz/alba/${doc.slug}` },
  },
}))


// ─── LABEL ─────────────────────────────────────────────────
export const Label = defineDocumentType(() => ({
  name: 'Label',
  filePathPattern: 'labely/**/*.mdx',
  contentType: 'mdx',
  fields: {
    title:       { type: 'string',   required: true },
    slug:        { type: 'string',   required: true },
    founded:     { type: 'string',   required: false },
    location:    { type: 'string',   required: false },
    description: { type: 'string',   required: true },
    image:       { type: 'string',   required: false },
    artists:     { type: 'list',     of: { type: 'string' }, required: false },
    publishedAt: { type: 'date',     required: true },
  },
  computedFields: {
    url:          { type: 'string', resolve: (doc) => `/labely/${doc.slug}` },
    canonicalUrl: { type: 'string', resolve: (doc) => `https://4rap.cz/labely/${doc.slug}` },
  },
}))

// ─── ZANR ──────────────────────────────────────────────────
export const Zanr = defineDocumentType(() => ({
  name: 'Zanr',
  filePathPattern: 'zanry/**/*.mdx',
  contentType: 'mdx',
  fields: {
    title:       { type: 'string',   required: true },
    slug:        { type: 'string',   required: true },
    origin:      { type: 'string',   required: false },
    description: { type: 'string',   required: true },
    image:       { type: 'string',   required: false },
    publishedAt: { type: 'date',     required: true },
  },
  computedFields: {
    url:          { type: 'string', resolve: (doc) => `/zanry/${doc.slug}` },
    canonicalUrl: { type: 'string', resolve: (doc) => `https://4rap.cz/zanry/${doc.slug}` },
  },
}))

// ─── CLANEK ────────────────────────────────────────────────
export const Clanek = defineDocumentType(() => ({
  name: 'Clanek',
  filePathPattern: 'clanky/**/*.mdx',
  contentType: 'mdx',
  fields: {
    title:       { type: 'string',   required: true },
    slug:        { type: 'string',   required: true },
    category:    { type: 'string',   required: true },
    description: { type: 'string',   required: true },
    image:       { type: 'string',   required: false },
    author:      { type: 'string',   required: false },
    featured:    { type: 'boolean',  default: false },
    publishedAt: { type: 'date',     required: true },
    updatedAt:   { type: 'date',     required: false },
    tags:        { type: 'list',     of: { type: 'string' }, required: false },
  },
  computedFields: {
    url:          { type: 'string', resolve: (doc) => `/clanky/${doc.slug}` },
    canonicalUrl: { type: 'string', resolve: (doc) => `https://4rap.cz/clanky/${doc.slug}` },
    readingTime: {
      type: 'number',
      resolve: (doc) => Math.ceil(doc.body.raw.split(/\s+/).length / 200),
    },
  },
}))


// ─── SKLADBA ───────────────────────────────────────────────
export const Skladba = defineDocumentType(() => ({
  name: 'Skladba',
  filePathPattern: 'skladby/**/*.mdx',
  contentType: 'mdx',
  fields: {
    title:       { type: 'string',   required: true },
    slug:        { type: 'string',   required: true },
    rapper:      { type: 'string',   required: true },
    rapperSlug:  { type: 'string',   required: true },
    features:    { type: 'list',     of: { type: 'string' }, required: false },
    featuresNames: { type: 'list',   of: { type: 'string' }, required: false },
    album:       { type: 'string',   required: false },
    albumSlug:   { type: 'string',   required: false },
    year:        { type: 'number',   required: false },
    genre:       { type: 'list',     of: { type: 'string' }, required: false },
    duration:    { type: 'string',   required: false },
    trackNumber: { type: 'number',   required: false },
    producers:   { type: 'list',     of: { type: 'string' }, required: false },
    producersNames: { type: 'list',  of: { type: 'string' }, required: false },
    description: { type: 'string',   required: true },
    image:       { type: 'string',   required: false },
    publishedAt: { type: 'date',     required: true },
    updatedAt:   { type: 'date',     required: false },
  },
  computedFields: {
    url:          { type: 'string', resolve: (doc) => `/skladby/${doc.slug}` },
    canonicalUrl: { type: 'string', resolve: (doc) => `https://4rap.cz/skladby/${doc.slug}` },
  },
}))

// ═══════════════════════════════════════════════════════════
// CONTENTLAYER SOURCE — auto-interlinking plugin v MDX pipeline
// ═══════════════════════════════════════════════════════════
export default makeSource({
  contentDirPath: 'content',
  documentTypes: [Rapper, Album, Label, Zanr, Clanek, Skladba],
  mdx: {
    remarkPlugins: [
      remarkGfm,
      // Auto-interlinking — každá zmínka entity se transformuje na <a>
      [remarkInterlinking, { registry: ENTITY_REGISTRY }],
    ],
    rehypePlugins: [rehypeHighlight],
  },
})
