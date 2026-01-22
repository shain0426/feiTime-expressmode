import { Request, Response } from "express";
import { fetchStrapiData, updateStrapiData } from "@/services/dataService";

export async function orderListHandler(req: Request, res: Response) {
  try {
    // 解析分頁參數，給預設值
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 100;
    const order_status = req.query.order_status as string;
    const createdAt = req.query.createdAt as string;
    const paid_at = req.query.paid_at as string;
    const shipped_at = req.query.shipped_at as string;
    const sort = req.query.sort as string | string[];

    // 呼叫公版函式取得資料
    // const data = await fetchStrapiData("products", "*", page, pageSize);

    //假設你要加篩選條件就會變成:
    // const data = await fetchStrapiData("products", "", 1, 100, {
    //   fields: ["name", "price"],
    //   filters: { origin: { $eq: "Taiwan" } },
    //   sort: ["price:desc"],
    // });

    const data = await fetchStrapiData("orders", "*", page, pageSize, {
      fields: [
        "order_number",
        "subtotal",
        "createdAt",
        "shipping_fee",
        "total_amount",
        "order_status",
        "payment_status",
        "paid_at",
        "recipient_name",
        "recipient_phone",
        "recipient_address",
        "customer_note",
        "shipping_method",
        "tracking_number",
        "shipped_at",
        "payment_method",
      ],
      filters: {
        ...(order_status && { order_status: { $eq: order_status } }),
        ...(createdAt && { createdAt: { $eq: createdAt } }),
        ...(paid_at && { paid_at: { $eq: paid_at } }),
        ...(shipped_at && { shipped_at: { $eq: shipped_at } }),
      },
      ...(sort && { sort: Array.isArray(sort) ? sort : [sort] }),
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
    const { order_number } = req.params; // 從 URL 參數取得 order_number

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

export async function updateOrderHandler(req: Request, res: Response) {
  try {
    const { order_number } = req.params;
    // req.body用來放「請求內容本體」，用在「送資料給後端」的請求
    const { tracking_number, shipped_at } = (req.body ?? {}) as {
      tracking_number?: string;
      shipped_at?: string;
    };

    // 驗證必填欄位
    if (!tracking_number || !shipped_at) {
      return res.status(400).json({
        error: "物流單號和出貨時間為必填",
        gotBody: req.body ?? null,
      });
    }

    // 用前端傳來的 order_number 去資料庫查詢訂單（取得 id )
    const orders = await fetchStrapiData("orders", "*", 1, 1, {
      filters: {
        order_number: { $eq: order_number },
      },
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        error: "找不到此訂單",
      });
    }

    // 訂單編號理論上是唯一的，所以拿第一筆訂單
    const order = orders[0];

    // 診斷日誌
    console.log("📋 訂單資料:", {
      id: order.id,
      order_number: order.order_number,
    });

    // 檢查 id 是否存在
    if (!order.id) {
      console.error("❌ 警告：id 不存在，訂單資料:", order);
      return res.status(500).json({
        error: "訂單缺少 id",
        order: order,
      });
    }

    // 準備要更新的內容(物流編號和出貨時間)，並把訂單狀態改成shipped
    const updateData = {
      tracking_number,
      shipped_at,
      order_status: "shipped",
    };

    // 用 id 更新訂單（真正修改），必須用 id （Strapi API 限制）
    const updatedOrder = await updateStrapiData("orders", order.id, {
      data: updateData,
    });

    // 更新成功 → 回傳給前端
    res.json({
      success: true,
      message: "出貨資訊更新成功",
      data: updatedOrder,
    });
  } catch (error: any) {
    console.error("[updateOrderHandler error]", error);
    res.status(500).json({
      error: "更新出貨資訊失敗",
      details: error.message,
    });
  }
}
