//公版
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.DATABASE_SERVICE_ROLE_KEY!
);

const strapiClient = axios.create({
  baseURL: process.env.STRAPI_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
  },
});

/**
 * Strapi 篩選運算子型別
 */
export interface StrapiFilterOperator {
  $eq?: string | number;
  $ne?: string | number;
  $lt?: number;
  $lte?: number;
  $gt?: number;
  $gte?: number;
  $in?: (string | number)[];
  $notIn?: (string | number)[];
  $contains?: string;
  $notContains?: string;
  $containsi?: string;
  $notContainsi?: string;
  $null?: boolean;
  $notNull?: boolean;
  $between?: [number, number];
  $startsWith?: string;
  $endsWith?: string;
}

/**
 * Strapi 篩選條件型別
 */
export type StrapiFilters = Record<
  string,
  StrapiFilterOperator | string | number
>;

/**
 * 公版函式：取得 Strapi 資料
 *
 * @param collectionName - Strapi collection 名稱，例如 "products"
 * @param populate - 是否展開關聯資料，預設 "*"
 * @param page - 分頁頁碼，預設 1
 * @param pageSize - 每頁筆數，預設 100
 * @param options - 可選設定
 *   fields: 只回傳哪些欄位，例如 ["name","price"]
 *   filters: 篩選條件，例如 { origin: { $eq: "Taiwan" } }
 *   sort: 排序，例如 ["price:desc"]
 */
export const fetchStrapiData = async (
  collectionName: string,
  populate = "*",
  page = 1,
  pageSize = 100,
  options?: {
    fields?: string[];
    filters?: StrapiFilters;
    sort?: string[];
  }
) => {
  try {
    // 初始化 params，放基本的分頁與 populate 設定
    const params: Record<string, string | number> = {
      populate,
      "pagination[page]": page,
      "pagination[pageSize]": pageSize,
    };

    // fields
    // 如果有傳 fields (想要回傳的欄位，例如 ["name","price"])
    // 就把每個欄位依照 Strapi API 的格式加到 params 裡
    // fields[0]=name, fields[1]=price
    if (options?.fields?.length) {
      options.fields.forEach((field, index) => {
        params[`fields[${index}]`] = field;
      });
    }

    // filters
    // 如果有傳 filters (篩選條件，例如 { origin: { $eq: "Taiwan" } })
    // 會把物件展開成 Strapi API 可以理解的格式
    // 例如 filters[origin][$eq]=Taiwan
    if (options?.filters) {
      Object.keys(options.filters).forEach((key) => {
        const value = options.filters![key];
        if (typeof value === "object" && value !== null) {
          Object.keys(value).forEach((op) => {
            const opValue = value[op as keyof typeof value];
            if (opValue !== undefined) {
              params[`filters[${key}][${op}]`] = Array.isArray(opValue)
                ? opValue.join(",")
                : String(opValue);
            }
          });
        } else {
          params[`filters[${key}]`] = String(value);
        }
      });
    }

    // sort
    // 如果有傳 sort (排序條件，例如 ["price:desc"])
    // 就把每個排序條件依序加到 params 裡
    // sort[0]=price:desc
    if (options?.sort?.length) {
      options.sort.forEach((s, index) => {
        params[`sort[${index}]`] = s;
      });
    }

    const queryString = new URLSearchParams(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ).toString();
    const fullUrl = `${strapiClient.defaults.baseURL}/api/${collectionName}?${queryString}`;
    console.log("🔍 FULL REQUEST URL:", fullUrl);

    const res = await strapiClient.get(`/api/${collectionName}`, { params });

    console.log("🚀 Strapi API URL:", res.request?.responseURL);
    console.log("🚀 Strapi response status:", res.status);
    console.log("🚀 Strapi response data:", res.data);

    // 直接回傳 data 層
    return res.data?.data ?? [];
  } catch (err) {
    const errorObj = err as { toJSON?: () => unknown; message?: string };
    console.error("❌ Strapi error full:", errorObj.toJSON?.() ?? err);

    const errorMessage = errorObj.message || "Strapi request failed";
    throw new Error(errorMessage);
  }
};

export const fetchSupabaseData = async (tableName: string, columns = "*") => {
  try {
    const { data, error } = await supabase.from(tableName).select(columns);
    if (error) throw error;
    return data;
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Supabase request failed";
    throw new Error(errorMessage);
  }
};
