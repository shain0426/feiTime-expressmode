import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";
import { handleError } from "@/utils";

export async function productHandler(req: Request, res: Response) {
  try {
    const roast = req.query.roast as string;
    // req 是前端要傳給後端的資料
    // query 是網址後面的參數
    // req.query.roast 就等於告訴後端 從網址中找到?roast=xxxxxx  也就是xxxxx
    // as string 告訴TS它是字串
    const origin = req.query.origin as string;
    const processing = req.query.processing as string;
    const flavor_type = req.query.flavor_type as string;
    const sort = req.query.sort as string | string[]; // sort可能是陣列

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 100;

    // 格式必須是：{ filters: { 欄位名(篩選什麼): { 運算子(怎麼篩選): 值 } } }
    const options = {
      filters: {
        ...(roast && { roast: { $eq: roast } }),
        // 如果沒有roast 變成 undefined && { roast: { $eq: undefined } }
        // 整條會變成 undefined  strapi會忽略這條 變成搜尋全部
        // 如果有roast 變成    淺焙 && { roast: { $eq: 淺焙 } }
        // 依照JS 當A、B都是true   A && B 會是B
        // 整條會變成 { roast: { $eq: 淺焙 } }
        ...(origin && { origin: { $eq: origin } }),
        ...(processing && { processing: { $eq: processing } }),
        ...(flavor_type && { flavor_type: { $eq: flavor_type } }),
      },
      ...(sort && { sort: Array.isArray(sort) ? sort : [sort] }),
      // 因為在後端 services > dataServices.ts 的 fetchStrapiData函數 用TS限制 sort要是一個字串陣列
      // 所以在這邊要確保 sort 一定是陣列
      // {sort: Array.isArray(sort) ? sort : [sort] }
      // 最左邊的sort是物件的key名字 冒號後面是一段三元判斷子
      // Array.isArray() 是JS固定的方法 依據丟進來的參數是不是陣列 回傳一個布林值
      // 如果變數sort是陣列 這個物件就是{sort:sort}
      // 如果變數sort是不是陣列 這個物件就是{sort:[sort]}
      // 最後面的sort 是從網址擷取下來的值 是要排序的東西和方式 例如 "price:desc"
      // 網址是 ?sort=price:desc 時 req.query.sort 會得到一個 字串
      // 網址是 ?sort=price:desc&sort=popularity:asc 時  後端 req.query.sort 會得到一個 陣列
    };

    const data = await fetchStrapiData(
      "products",
      "*",
      page,
      pageSize,
      options
    );

    res.json(data);
  } catch (error) {
    return handleError(error, res, "取得 products 失敗");
  }
}
