import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";

export async function orderListHandler(req: Request, res: Response) {
  try {
    // 解析分頁參數，給預設值
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 100;

    // 呼叫公版函式取得資料
    // const data = await fetchStrapiData("products", "*", page, pageSize);

    //假設你要加篩選條件就會變成:
    // const data = await fetchStrapiData("products", "", 1, 100, {
    //   fields: ["name", "price"],
    //   filters: { origin: { $eq: "Taiwan" } },
    //   sort: ["price:desc"],
    // });

    const data = await fetchStrapiData("orders", "*", 1, 100, {
      fields: [
        "order_number",
        "subtotal",
        "shipping_fee",
        "total_amount",
        "order_status",
        "payment_status",
        "recipient_name",
        "recipient_phone",
        "recipient_address",
        "customer_note",
        "shipping_method",
        "tracking_number",
        "payment_method",
      ],
    });

    console.log("📦 後端拿到資料筆數:", data?.length);
    console.log("📦 第一筆資料範例:", data?.[0]);

    // ⭐ 重要：回傳符合前端期望的格式
    res.json({
      data: data || [], // 包在 data 屬性中
    });

    // console.log("後端拿到資料", data);
    // 原樣回傳給前端
    // res.json(data);
  } catch (error: any) {
    console.error("[orderListHandler error]", error);

    res.status(500).json({
      error: "取得 order 失敗",
    });
  }
}

export async function singleOrderHandler(req: Request, res: Response) {
  try {
    const { order_number } = req.params; // 從 URL 參數取得 pid

    const data = await fetchStrapiData("orders", "*", 1, 1, {
      filters: {
        order_number: { $eq: order_number }, // 根據 order_number 篩選
      },
    });

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: "找不到此商品",
      });
    }

    res.json({
      data: data[0], // 回傳單筆資料
    });
  } catch (error: any) {
    console.error("[singleOrderHandler error]", error);
    res.status(500).json({
      error: "取得商品失敗",
    });
  }
}
