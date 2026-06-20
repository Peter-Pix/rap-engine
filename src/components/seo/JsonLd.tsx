/**
 * Server-rendered JSON-LD <script> tag for Schema.org structured data.
 *
 * Použití:
 *   <JsonLd data={{ '@context': 'https://schema.org', '@type': 'MusicGroup', ... }} />
 *
 * - Renderuje se jako `<script type="application/ld+json">` s dangerouslySetInnerHTML.
 * - Next.js ho zahrne do SSR výstupu → čte ho Googlebot, Bingbot, OG crawleři.
 * - Pokud `data === null | undefined` nebo prázdné, negeneruje nic (žádný prázdný tag).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | null | undefined }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <script
      type="application/ld+json"
      // JSON.stringify na serveru → bezpečné (deterministické, ne uživ. vstup).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
