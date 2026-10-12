import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";
import {
  readEntityById,
  readEntities,
} from "@/lib/content/cache-reader";
import { getArtistImage } from "@/lib/content/images";
import { TYPE_ROUTE_MAP, type EntityType } from "@/lib/content/constants";

/**
 * Dynamický OG obrázek (1200×630) pro libovolnou entitu.
 *
 * URL: /og/<type>/<slug>  →  např. /og/track/vladimir-518-smichov-ujezd
 *
 * Design: tmavé pozadí, zlatý akcent, obal alba / foto interpreta vpravo,
 * vlevo eyebrow s typem entity + název. Fallback bez obrázku = čistý text.
 *
 * Proč: 2 000+ autoritativních stránek dosud sdílelo jeden generický
 * /og-image.png. Teď má každá vlastní brandovaný preview pro sociální sítě.
 */

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LABELS: Record<string, string> = {
  artist: "Interpret",
  album: "Album",
  track: "Skladba",
  genre: "Žánr",
  style: "Styl",
  theme: "Téma",
  mood: "Nálada",
  scene: "Scéna",
  label: "Label",
  location: "Lokalita",
  producer: "Producent",
  collective: "Kolektiv",
};

const GOLD = "#c8962e";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug: parts } = await params;
  // parts = [type, slug]
  const [type, ...rest] = parts;
  const slug = rest.join("/");

  const id = `${type}_${slug}`;
  const entity = readEntityById(id);

  if (!entity) {
    return new Response("Not found", { status: 404 });
  }

  const label = LABELS[entity.type] ?? entity.type;

  // Obrázek: artist → getArtistImage, album/track → cover z alba
  let imageUrl: string | null = null;
  if (entity.type === "artist") {
    imageUrl = getArtistImage(entity.slug) ?? null;
  } else if (entity.type === "album" && (entity as any).image) {
    imageUrl = (entity as any).image;
  } else if (entity.type === "track") {
    const albumId = (entity.outbound?.BELONGS_TO_ALBUM ?? [])[0];
    if (albumId) {
      const album = readEntityById(albumId);
      imageUrl = (album as any)?.image ?? null;
    }
  }

  // Satori NEUMÍ WebP (naše artist fotky jsou .webp). Lokální obrázky proto
  // konvertujeme přes sharp na PNG data-URI. Vzdálené (Deezer CDN, JPEG)
  // necháme Satori načíst přímo.
  if (imageUrl && imageUrl.startsWith("/") && imageUrl.endsWith(".webp")) {
    try {
      const sharpMod = (await import("sharp")).default;
      const abs = path.join(process.cwd(), "public", imageUrl);
      const png = await sharpMod(fs.readFileSync(abs))
        .resize(560, 630, { fit: "cover", position: "top" })
        .png()
        .toBuffer();
      imageUrl = `data:image/png;base64,${png.toString("base64")}`;
    } catch {
      imageUrl = null; // když konverze selže, radši čistý text než rozbitý obrázek
    }
  }

  const title = entity.title;
  // Zkrátit příliš dlouhé názvy, ať se vejdou na 2 řádky
  const titleSize = title.length > 42 ? 56 : title.length > 24 ? 68 : 82;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#09090b",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Obrázek vpravo s gradientem do pozadí */}
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            width={560}
            height={630}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              height: "630px",
              width: "560px",
              objectFit: "cover",
            }}
          />
        )}
        {imageUrl && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: "700px",
              height: "630px",
              background:
                "linear-gradient(90deg, #09090b 12%, rgba(9,9,11,0.85) 42%, rgba(9,9,11,0.2) 100%)",
            }}
          />
        )}

        {/* Text vlevo */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px",
            width: imageUrl ? "720px" : "100%",
            position: "relative",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span
              style={{
                fontSize: "34px",
                fontWeight: 900,
                fontStyle: "italic",
                letterSpacing: "-0.03em",
                color: "#ffffff",
              }}
            >
              4RAP<span style={{ color: GOLD }}>.</span>
            </span>
          </div>

          {/* Název + typ */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: "26px",
                fontWeight: 600,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: GOLD,
                marginBottom: "20px",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontSize: `${titleSize}px`,
                fontWeight: 900,
                letterSpacing: "-0.035em",
                lineHeight: 1.0,
                color: "#ffffff",
                maxWidth: "640px",
              }}
            >
              {title}
            </span>
          </div>

          {/* Patička */}
          <div
            style={{
              fontSize: "24px",
              color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.02em",
            }}
          >
            Mapa české rapové scény
          </div>
        </div>

        {/* Zlatý akcentní pruh dole */}
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "220px",
            height: "6px",
            background: GOLD,
          }}
        />
      </div>
    ),
    { ...size },
  );
}
