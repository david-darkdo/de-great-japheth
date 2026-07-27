/**
 * Centralized Public URL builder for DE GREAT JAPHET.
 * Dynamically resolves the current origin in browser or fallback environment URL,
 * prioritizing the production custom domain: https://degreatjaphet.com.ng
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
  return `https://degreatjaphet.com.ng${cleanPath}`;
}

export function getProductUrl(id: string): string {
  return getPublicUrl(`/product/${id}`);
}

export function getCategoryUrl(slug: string, subcategory?: string): string {
  if (subcategory) {
    return getPublicUrl(`/category/${slug}?sub=${encodeURIComponent(subcategory)}`);
  }
  return getPublicUrl(`/category/${slug}`);
}

export function getFamilyUrl(slug: string): string {
  return getPublicUrl(`/family/${slug}`);
}

export function getCollectionUrl(orderCode: string): string {
  return getPublicUrl(`/collection/${orderCode}`);
}
