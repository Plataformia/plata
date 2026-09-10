/**
 * A morada oficial do site, num sitio so.
 *
 * MUDA AQUI quando o dominio proprio estiver ligado na Vercel
 * (Settings > Domains). Nao e preciso mexer em mais nenhum
 * ficheiro de codigo: o canonical, as etiquetas de partilha,
 * o sitemap e os dados estruturados leem todos esta constante.
 *
 * O unico sitio de fora e o public/robots.txt, que e um ficheiro
 * estatico e nao consegue importar codigo.
 */
export const SITE_URL = "https://plata-mariana-e2dd.vercel.app";

/** A mesma morada com barra no fim, para canonical e og:url. */
export const SITE_URL_SLASH = `${SITE_URL}/`;
