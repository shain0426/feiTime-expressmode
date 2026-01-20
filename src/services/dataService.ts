//公版
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const strapiClient = axios.create({
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
 * 支援直接欄位過濾和巢狀關聯欄位過濾
 */
export type StrapiFilters = Record<
  string,
  | StrapiFilterOperator
  | string
  | number
  | Record<string, StrapiFilterOperator | string | number>  // 支援巢狀關聯欄位 (如 user.id)
>;

/**
 * 公版函式：取得 Strapi 資料 (GET)
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
    populate?: string[];  // 新增：指定要展開的關聯
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

    // populate (覆蓋預設的 "*")
    // 如果有傳 populate (關聯展開，例如 ["product"])
    // 會覆蓋預設的 populate 參數
    if (options?.populate?.length) {
      delete params.populate;  // 移除預設的 "*"
      options.populate.forEach((rel, index) => {
        params[`populate[${index}]`] = rel;
      });
    }

    // 使用 upstream 改進的 queryString 處理（確保所有值都是字串）
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

/**
 * 公版函式：新增 Strapi 資料 (POST)
 * @description 給購物車使用的版本，會自動包裝 data
 */
export const postStrapiData = async (collectionName: string, data: any) => {
  try {
    console.log("POST Headers:", strapiClient.defaults.headers);
    const res = await strapiClient.post(`/api/${collectionName}`, { data });
    return res.data?.data;
  } catch (err: any) {
    console.error("❌ Strapi POST error:", err.toJSON?.() ?? err);
    // 確保錯誤往上拋時包含 response 資料 (讓 controller 可以抓到 details)
    if (err.response) {
      throw err;
    }
    throw new Error(err.message);
  }
};

/**
 * 公版函式：更新 Strapi 資料 (PUT)
 * @description 給購物車使用的版本，接受 documentId 參數
 */
export const putStrapiData = async (
  collectionName: string,
  documentId: string,
  data: any
) => {
  try {
    const res = await strapiClient.put(`/api/${collectionName}/${documentId}`, {
      data,
    });
    return res.data?.data;
  } catch (err: any) {
    console.error("❌ Strapi PUT error:", err.toJSON?.() ?? err);
    throw err;
  }
};

/**
 * 公版函式：新增 Strapi 資料 (POST) - upstream 版本
 * @description 給其他模組使用的版本，需要手動傳入 { data: {...} }
 *
 * @param collectionName - Strapi collection 名稱，例如 "products"
 * @param payload - 要新增的資料，例如 { data: { name: "咖啡豆", price: 500 } }
 * @returns Strapi 回應資料
 */
export const createStrapiData = async (
  collectionName: string,
  payload: { data: Record<string, unknown> }
) => {
  try {
    console.log(`📝 Creating data in ${collectionName}:`, payload);

    const res = await strapiClient.post(`/api/${collectionName}`, payload);

    console.log("✅ Create success:", res.status);
    console.log("✅ Response data:", res.data);

    return res.data;
  } catch (err) {
    const errorObj = err as { toJSON?: () => unknown; message?: string };
    console.error("❌ Create error:", errorObj.toJSON?.() ?? err);

    const errorMessage = errorObj.message || "Create request failed";
    throw new Error(errorMessage);
  }
};

/**
 * 公版函式：更新 Strapi 資料 (PUT)
 *
 * @param collectionName - Strapi collection 名稱，例如 "products"
 * @param id - 要更新的資料 ID
 * @param payload - 要更新的資料，例如 { data: { price: 600 } }
 * @returns Strapi 回應資料
 */
export const updateStrapiData = async (
  collectionName: string,
  id: number | string,
  payload: { data: Record<string, unknown> }
) => {
  try {
    console.log(`✏️ Updating ${collectionName} #${id}:`, payload);

    const res = await strapiClient.put(`/api/${collectionName}/${id}`, payload);

    console.log("✅ Update success:", res.status);
    console.log("✅ Response data:", res.data);

    return res.data;
  } catch (err) {
    const errorObj = err as { toJSON?: () => unknown; message?: string };
    console.error("❌ Update error:", errorObj.toJSON?.() ?? err);

    const errorMessage = errorObj.message || "Update request failed";
    throw new Error(errorMessage);
  }
};

/**
 * 公版函式：刪除 Strapi 資料 (DELETE)
 *
 * @param collectionName - Strapi collection 名稱，例如 "products"
 * @param id - 要刪除的資料 ID
 * @returns Strapi 回應資料
 */
export const deleteStrapiData = async (
  collectionName: string,
  id: number | string
) => {
  try {
    console.log(`🗑️ Deleting ${collectionName} #${id}`);

    const res = await strapiClient.delete(`/api/${collectionName}/${id}`);

    console.log("✅ Delete success:", res.status);
    console.log("✅ Response data:", res.data);

    return res.data;
  } catch (err) {
    const errorObj = err as { toJSON?: () => unknown; message?: string };
    console.error("❌ Delete error:", errorObj.toJSON?.() ?? err);

    const errorMessage = errorObj.message || "Delete request failed";
    throw new Error(errorMessage);
  }
};
