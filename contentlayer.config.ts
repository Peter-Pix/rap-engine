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
    title:        { type: 'string',   required: true },
    slug:         { type: 'string',   required: true },
    realName:     { type: 'string',   required: false },
    born:         { type: 'string',   required: false },
    birthDate:    { type: 'string',   required: false },
    birthPlace:   { type: 'string',   required: false },
    active:       { type: 'string',   required: false },
    label:        { type: 'string',   required: false },
    labelSlug:    { type: 'string',   required: false },
    genre:        { type: 'list',     of: { type: 'string' }, required: false },
    description:  { type: 'string',   required: false },
    summary:      { type: 'string',   required: false },
    image:        { type: 'string',   required: false },
    featured:     { type: 'boolean',  default: false },
    publishedAt:  { type: 'date',     required: false },
    updatedAt:    { type: 'date',     required: false },
    relatedRappers: { type: 'list',   of: { type: 'string' }, required: false },
    relatedAlbums:  { type: 'list',   of: { type: 'string' }, required: false },
    deezerId:     { type: 'number',   required: false },
    socials:      { type: 'json',     required: false },
    spotify:      { type: 'string',   required: false },
    aliases:      { type: 'list',     of: { type: 'string' }, required: false },
    origin:       { type: 'string',   required: false },
    hometown:     { type: 'string',   required: false },
    city:         { type: 'string',   required: false },
    labels:       { type: 'list',     of: { type: 'string' }, required: false },
    subgenres:    { type: 'list',     of: { type: 'string' }, required: false },
    subgenre:     { type: 'list',     of: { type: 'string' }, required: false },
    status:       { type: 'string',   required: false },
    associatedActs: { type: 'list',   of: { type: 'string' }, required: false },
    activeSince:  { type: 'string',   required: false },
    entityType:   { type: 'string',   required: false },
    members:      { type: 'list',     of: { type: 'string' }, required: false },
    founded:      { type: 'string',   required: false },
    memberOf:     { type: 'string',   required: false },
    createdAt:    { type: 'date',     required: false },
    seo:          { type: 'json',     required: false },
    crew:         { type: 'string',   required: false },
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
    title:        { type: 'string',   required: true },
    slug:         { type: 'string',   required: true },
    rapper:       { type: 'string',   required: true },
    rapperSlug:   { type: 'string',   required: true },
    label:        { type: 'string',   required: false },
    labelSlug:    { type: 'string',   required: false },
    year:         { type: 'number',   required: true },
    genre:        { type: 'list',     of: { type: 'string' }, required: false },
    description:  { type: 'string',   required: true },
    summary:      { type: 'string',   required: false },
    image:        { type: 'string',   required: false },
    featured:     { type: 'boolean',  default: false },
    tracklist:    { type: 'list',     of: { type: 'string' }, required: false },
    rating:       { type: 'number',   required: false },
    publishedAt:  { type: 'date',     required: true },
    updatedAt:    { type: 'date',     required: false },
    deezerAlbumId: { type: 'number',  required: false },
    upc:          { type: 'string',   required: false },
    origin:       { type: 'string',   required: false },
    releaseType:  { type: 'string',   required: false },
    features:     { type: 'list',     of: { type: 'string' }, required: false },
    featuresNames: { type: 'list',    of: { type: 'string' }, required: false },
    producers:    { type: 'list',     of: { type: 'string' }, required: false },
    producersNames: { type: 'list',   of: { type: 'string' }, required: false },
    producer:     { type: 'string',   required: false },
    artist:       { type: 'string',   required: false },
    duration:     { type: 'number',   required: false },
    explicit:     { type: 'boolean',  default: false },
    releaseDate:  { type: 'date',     required: false },
    nbTracks:     { type: 'number',   required: false },
    subgenres:    { type: 'list',     of: { type: 'string' }, required: false },
    labelName:    { type: 'string',   required: false },
    cover:        { type: 'string',   required: false },
    aliases:      { type: 'list',     of: { type: 'string' }, required: false },
    activeSince:  { type: 'string',   required: false },
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
    founded:     { type: 'number',   required: false },
    location:    { type: 'string',   required: false },
    description: { type: 'string',   required: true },
    image:       { type: 'string',   required: false },
    artists:     { type: 'list',     of: { type: 'string' }, required: false },
    members:     { type: 'list',     of: { type: 'string' }, required: false },
    publishedAt: { type: 'date',     required: true },
    updatedAt:   { type: 'date',     required: false },
    website:     { type: 'string',   required: false },
    city:        { type: 'string',   required: false },
    country:     { type: 'string',   required: false },
    founder:     { type: 'string',   required: false },
    genre:       { type: 'list',     of: { type: 'string' }, required: false },
    entityType:  { type: 'string',   required: false },
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
    title:         { type: 'string',   required: true },
    slug:          { type: 'string',   required: true },
    origin:        { type: 'string',   required: false },
    description:   { type: 'string',   required: true },
    image:         { type: 'string',   required: false },
    publishedAt:   { type: 'date',     required: true },
    aliases:       { type: 'list',     of: { type: 'string' }, required: false },
    relatedGenres: { type: 'list',     of: { type: 'string' }, required: false },
    caseSensitive: { type: 'boolean',  default: false },
    color:         { type: 'string',   required: false },
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
    category:    { type: 'string',   required: false },
    description: { type: 'string',   required: true },
    image:       { type: 'string',   required: false },
    author:      { type: 'string',   required: false },
    featured:    { type: 'boolean',  default: false },
    publishedAt: { type: 'date',     required: true },
    updatedAt:   { type: 'date',     required: false },
    tags:        { type: 'list',     of: { type: 'string' }, required: false },
    deezerTrackId:{ type: 'number',   required: false },
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
    title:        { type: 'string',   required: true },
    slug:         { type: 'string',   required: true },
    rapper:       { type: 'string',   required: true },
    rapperSlug:   { type: 'string',   required: false },
    label:        { type: 'string',   required: false },
    labelSlug:    { type: 'string',   required: false },
    features:     { type: 'list',     of: { type: 'string' }, required: false },
    featuresNames: { type: 'list',    of: { type: 'string' }, required: false },
    album:        { type: 'string',   required: false },
    albumSlug:    { type: 'string',   required: false },
    year:         { type: 'number',   required: false },
    genre:        { type: 'list',     of: { type: 'string' }, required: false },
    duration:     { type: 'string',   required: false },
    trackNumber:  { type: 'number',   required: false },
    producers:    { type: 'list',     of: { type: 'string' }, required: false },
    producersNames: { type: 'list',   of: { type: 'string' }, required: false },
    description:  { type: 'string',   required: true },
    image:        { type: 'string',   required: false },
    publishedAt:  { type: 'date',     required: true },
    updatedAt:    { type: 'date',     required: false },
    deezerTrackId: { type: 'number',  required: false },
    releaseType:  { type: 'string',   required: false },
    explicit:     { type: 'boolean',  default: false },
    releaseDate:  { type: 'date',     required: false },
  },
  computedFields: {
    url:          { type: 'string', resolve: (doc) => `/skladby/${doc.slug}` },
    canonicalUrl: { type: 'string', resolve: (doc) => `https://4rap.cz/skladby/${doc.slug}` },
  },
}))

// ═══════════════════════════════════════════════════════════
// CONTENTLAYER SOURCE
// ═══════════════════════════════════════════════════════════
export default makeSource({
  contentDirPath: 'content',
  documentTypes: [Rapper, Album, Label, Zanr, Clanek, Skladba],
  mdx: {
    remarkPlugins: [
      remarkGfm,
      [remarkInterlinking, { registry: ENTITY_REGISTRY }],
    ],
    rehypePlugins: [rehypeHighlight],
  },
})