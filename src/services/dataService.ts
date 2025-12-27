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

export const fetchStrapiData = async (
  collectionName: string,
  // collectionName 為第一個參數 它告訴 API 要去哪一個資料夾翻東西
  // fetchStrapiData("products", ...)  網址就會拼接成 /api/products
  populate = "*",
  page = 1,
  pageSize = 100,
  filters: any = {} // 用來裝「篩選」 用物件可以兼容多筆篩選 且 只需傳遞一個變數
  // 初始狀態：filters = {}（
  // 加入焙度：filters 變成 {"filters[roast][$eq]": "Light"}
  // 加入國家：filters 變成 {"filters[roast][$eq]": "Light", "filters[country][$eq]": "Japan"}
) => {
  try {
    const res = await strapiClient.get(`/api/${collectionName}`, {
      // strapiClient 是在上面用 axios.create 出來的打API.get函數

      // 在開發為方便管理常用物件儲存 但網路傳輸它只能是一長串字串
      // 開發者：在 params 物件裡寫好 roast: 'Light', country: 'Japan'
      // axios 會把 params 物件裡的每一個 key: value 拿出來 中間用 & 連接 放在問號 ?
      params: {
        populate,
        // populate: populate,的縮寫
        // 左 populate (Key)：Strapi API 規定的名字  Strapi會抓網址內 ?populate=... 後的值
        // 右 populate (Value)：傳進函數的變數 也就是呼叫 fetchStrapiData("products", "*") 時，傳進去的那個 "*"

        // 在Strapi（以及很多現代資料庫）中 為了求快 預設是「懶惰」的
        // 若沒populate 只會抓「純文字」資料  不會主動去抓「關聯資料」，例如：圖片、分類 (Category)。
        // populate: "*"  抓全部資料
        "pagination[page]": page,
        "pagination[pageSize]": pageSize,
        ...filters, //  用 ... 把filters炸開 讓裡面的內容 變成params物件的key:value
      },
    });

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
