export type ProductIntelligenceData = {
  description: string;
  seo_title: string;
  meta_description: string;
  seo_keywords: string[];
  slug: string;
  search_keywords: string[];
  canonical_product_name: string;
  related_terms: string[];
  product_summary: string;
  confidence: number;
};

export type GenerateInput = {
  productName: string;
  category?: string;
  family?: string;
  brand?: string;
  price?: number | string;
  currency?: string;
  description?: string;
  manualSpecs?: string;
  productImage?: string;
};

export async function generateProductIntelligence(
  input: GenerateInput
): Promise<ProductIntelligenceData> {
  const res = await fetch("/api/ai/product-intelligence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || `HTTP ${res.status}: AI Product Intelligence generation failed`);
  }

  const data: ProductIntelligenceData = await res.json();
  return data;
}
