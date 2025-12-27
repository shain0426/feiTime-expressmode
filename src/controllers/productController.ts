import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";

export async function productHandler(req: Request, res: Response) {
  try {
    const roast = req.query.roast;
    // req 是前端要傳給後端的資料
    // query 是網址後面的參數
    // req.query.roast 就等於告訴後端 從網址中找到?roast=xxxxxx  也就是xxxxx

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 100;

    const filterParams: any = {};
    // 在 services > dataServices.ts 做好的 fetchStrapiData函數的第五參數要為一個物件
    // 所以先做好filterParams物件  等等帶入
    if (roast) {
      filterParams["filters[roast][$eq]"] = roast;
      // JS中 有特殊符號key 要用[] 所以這是在做一個 key ["filters[roast][$eq]"]  value 是 roast(上面剛從網址抓出來的)
      // filters 是 Strapi 固定的開頭  要使 Strapi 篩選，網址參數就必須以這個單字開頭
      // [roast] 是 Strapi 的欄位名稱  可調整內容  如果要篩選國家 就寫 [country]
      // [$eq] 是等於 可調整篩選方式
    }

    const data = await fetchStrapiData(
      "products",
      "*",
      page,
      pageSize,
      filterParams
    );

    res.json(data);
  } catch (error: any) {
    console.error("[productHandler error]", error);
    res.status(500).json({
      error: "取得 products 失敗",
    });
  }
}
