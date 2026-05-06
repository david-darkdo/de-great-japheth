export const CATEGORIES = [
  "Security Doors",
  "Roofing Tiles",
  "Tiles",
  "Electrical",
  "Plumbing",
  "Paints",
  "Fencing Wires",
  "Ceiling Materials",
] as const;

export const HOME_CATEGORIES = [
  "Security Doors",
  "Electrical",
  "Plumbing",
  "Ceiling Materials",
] as const;

export function categorySlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function categoryFromSlug(slug: string) {
  return CATEGORIES.find((c) => categorySlug(c) === slug);
}
