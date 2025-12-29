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
    // Record<string, any> 是TS的寫法 他定義一個物件
    // string  物件的 key 必須是字串
    // any  物件的 value 型別不限
    sort?: string[]; // string[] 是裡面只能裝字串的陣列
  }
  //  ? 代表可有可無
  //  fetchStrapiData的第五個參數為 options物件 他可帶可不帶
  //  options物件內有 fields filters sort 它們也都可有可無
  //  fields filters sort 是 Strapi  定義的「功能關鍵字」
) => {
  try {
    // 初始化 params，放基本的分頁與 populate 設定
    const params: Record<string, any> = {
      // 建立一個物件 型別是  Record<string, any>
      populate,
      "pagination[page]": page,
      "pagination[pageSize]": pageSize,
    };

    // fields
    // 如果有傳 fields (想要回傳的欄位，例如 ["name","price"])
    // 就把每個欄位依照 Strapi API 的格式加到 params 裡
    // fields[0]=name, fields[1]=price
    if (options?.fields?.length) {
      // 如果 options 存在，且裡面有 fields 這個陣列，且陣列裡面有東西 (length > 0)
      options.fields.forEach((field, index) => {
        params[`fields[${index}]`] = field; // 用賦予 物件.key = value 的方式 在 params 物件逐一新增屬性
      });
      // 例 const options = {
      //        fields: ["name", "origin"]
      //        };
      //  執行完 params = {
      //  "fields[0]" : "name" ,
      //  "fields[1]" : "origin" ,
      //   }
      //  最後網址會帶上 &fields[0]=name&fields[1]=origin
    }

    // filters
    // 如果有傳 filters (篩選條件，例如 { origin: { $eq: "Taiwan" } })
    // 會把物件展開成 Strapi API 可以理解的格式
    // 例如 filters[origin][$eq]=Taiwan
    if (options?.filters) {
      Object.keys(options.filters).forEach((key) => {
        // Object.keys() 是JS的現成函數 可以把帶進去的物件的key 抓出來變成一個陣列
        // 變數 = Object.keys(某物件)  變數就會是所有key的陣列
        // 所以這邊 Object.keys(options.filters) = 所有key的陣列
        const value = options.filters![key];
        // 那個 ! 是 TS 的「非空斷言」 告訴 TS 我確定options.filters它現在有值
        if (typeof value === "object") {
          Object.keys(value).forEach((op) => {
            params[`filters[${key}][${op}]`] = value[op];
          });
        } else {
          params[`filters[${key}]`] = value;
        }
      });
      // 假設前端送了請求 選篩選國家日本  filters就會是 { origin: { $eq: "Japan" } }
      // Object.keys(options.filters) 取出key 為 origin   value 為 { $eq: "Japan" }
      // if 判斷 value = { $eq: "Japan" } 是物件  就再抽取一次 得到op = $eq   value[op] = value物件 key為op(就是$eq)的值 = "Japan"
      // 保險起見 有可能 filters會是 { id: 1 } 1不是物件 所以需要if判斷 如果不是物件 直接組合網址
      // 用此方法把  filters 內的東西 變成網址格式
    }

    // sort
    // 如果有傳 sort (排序條件，例如 ["price:desc"])
    // 就把每個排序條件依序加到 params 裡
    // sort[0]=price:desc
    // Strapi 規定排序字串要寫成 欄位名:方式。
    // price:asc (價格低到高)
    // price:desc (價格高到低)

    if (options?.sort?.length) {
      options.sort.forEach((s, index) => {
        params[`sort[${index}]`] = s;
      });
    }

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
