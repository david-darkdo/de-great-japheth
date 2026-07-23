/**
 * Centralized Public URL builder for De Great Japhet.
 * Dynamically resolves the current origin in browser or fallback environment URL,
 * ensuring links work seamlessly across Vercel, Cloudflare, Custom Domains, and Localhost.
 */
export function getPublicUrl(path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${cleanPath}`;
  }
  const envUrl = (import.meta as any).env?.VITE_SITE_URL || (import.meta as any).env?.VITE_PUBLIC_SITE_URL;
  if (envUrl) {
    return `${envUrl.replace(/\/$/, "")}${cleanPath}`;
  }
  return `https://de-great-japheth.vercel.app${cleanPath}`;
}

export function getProductUrl(id: string): string {
  return getPublicUrl(`/product/${id}`);
}

export function getCollectionUrl(orderCode: string): string {
  return getPublicUrl(`/collection/${orderCode}`);
}
