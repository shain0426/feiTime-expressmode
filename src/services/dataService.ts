//公版
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.DATABASE_SERVICE_ROLE_KEY!,
);

const strapiClient = axios.create({
  baseURL: process.env.STRAPI_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
  },
});

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
    filters?: Record<string, any>;
    sort?: string[];
  },
) => {
  try {
    // 初始化 params，放基本的分頁與 populate 設定
    const params: Record<string, any> = {
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
        if (typeof value === "object") {
          Object.keys(value).forEach((op) => {
            params[`filters[${key}][${op}]`] = value[op];
          });
        } else {
          params[`filters[${key}]`] = value;
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

    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${strapiClient.defaults.baseURL}/api/${collectionName}?${queryString}`;
    console.log("🔍 FULL REQUEST URL:", fullUrl);

    const res = await strapiClient.get(`/api/${collectionName}`, { params });

    console.log("🚀 Strapi API URL:", res.request?.responseURL);
    console.log("🚀 Strapi response status:", res.status);
    console.log("🚀 Strapi response data:", res.data);

    // 直接回傳 data 層
    return res.data?.data ?? [];
  } catch (err: any) {
    console.error("❌ Strapi error full:", err.toJSON?.() ?? err);
    throw new Error(err.message);
  }
};

export const fetchSupabaseData = async (tableName: string, columns = "*") => {
  try {
    const { data, error } = await supabase.from(tableName).select(columns);
    if (error) throw error;
    return data;
  } catch (err: any) {
    throw new Error(err.message);
  }
};

/**
 * 公版函式：新增資料到 Strapi
 * @param table - Strapi table 名稱，例如 "products"
 * @param dataObj - 要存入的資料物件
 */
export const strapiPost = async (table: string, dataObj: any) => {
  try {
    // Strapi 的規範：所有欄位必須放在 "data" 層級下
    const body = {
      data: dataObj,
    };

    const res = await strapiClient.post(`/api/${table}`, body);

    console.log(`✅ ${table} 新增成功:`, res.data);

    // Strapi 回傳通常也會包在 data 欄位裡
    return res.data?.data ?? null;
  } catch (err: any) {
    // 詳細記錄錯誤，方便除錯 (Strapi 的報錯通常在 err.response.data)
    console.error("❌ Strapi POST Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || "資料新增失敗");
  }
};

export const strapiPut = async (table: string, dataObj: any, id: string) => {
  try {
    const body = {
      data: dataObj,
    };

    const res = await strapiClient.put(`/api/${table}/${id}`, body);

    console.log("Strapi 原生回傳:", JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (err: any) {
    console.error("❌ 失敗:", err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || "資料新增失敗");
  }
};

export const productsPut = async (table: string, dataObj: any, id: string) => {
  try {
    const body = {
      data: dataObj,
    };

    const res = await strapiClient.put(`/api/${table}/${id}`, body);

    console.log("Strapi 原生回傳:", JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (err: any) {
    console.error("❌ 失敗:", err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || "資料新增失敗");
  }
};

export const cartsDelete = async (table: string, id: string) => {
  try {
    const res = await strapiClient.delete(`/api/${table}/${id}`);

    console.log("Strapi 原生回傳:", JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (err: any) {
    console.error("❌ 失敗:", err.response?.data || err.message);
    throw new Error(err.response?.data?.error?.message || "資料新增失敗");
  }
};
