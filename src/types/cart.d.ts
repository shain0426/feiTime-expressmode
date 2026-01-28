// === 購物車推薦相關類型 ===

/**
 * Strapi 圖片結構
 */
export interface StrapiImage {
    id: number;
    url: string;
    alternativeText?: string;
    width?: number;
    height?: number;
    formats?: Record<string, unknown>;
}

/**
 * Strapi 商品結構 (對應 products collection)
 */
export interface StrapiProduct {
    id: number;
    documentId?: string;
    name: string;
    flavor_type: "Fruity" | "Floral" | "Nutty" | "Bold";
    roast: "Light" | "Medium" | "Dark";
    origin?: string;
    processing?: string;
    flavor_tags?: string[];
    price: number;
    stock?: number;
    img?: StrapiImage[];
}

/**
 * 前端傳來的購物車項目
 */
export interface CartItemInput {
    id: number;
    name: string;
    flavor_type?: "Fruity" | "Floral" | "Nutty" | "Bold";
    roast?: "Light" | "Medium" | "Dark";
    quantity?: number;
}

/**
 * 帶有契合度分數的商品
 */
export interface ScoredProduct extends StrapiProduct {
    matchScore: number;
}
