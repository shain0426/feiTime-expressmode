import { Request, Response } from "express";
import { fetchStrapiData, putStrapiData } from "@/services/dataService";
import { handleError } from "@/utils/errorHandler";
import {
  getAvailableCarriers,
  importPackages,
  getTrackingByUuid,
} from "@/services/trackService";

export async function orderListHandler(req: Request, res: Response) {
  try {
    // 解析分頁參數，給預設值
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 1000;
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

    const result = await fetchStrapiData("orders", "*", page, pageSize, {
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
        "UUID",
      ],
      filters: {
        ...(order_status && { order_status: { $eq: order_status } }),
        ...(createdAt && { createdAt: { $eq: createdAt } }),
        ...(paid_at && { paid_at: { $eq: paid_at } }),
        ...(shipped_at && { shipped_at: { $eq: shipped_at } }),
      },
      sort: ["createdAt:desc", "order_number:desc"],
      includeMeta: true,
    });

    console.log("📦 後端拿到資料筆數:", result.data?.length);
    console.log("📦 分頁資訊:", result.meta);
    console.log("📦 第一筆資料範例:", result.data?.[0]);

    // ✅ 正確回傳格式
    res.json({
      data: result.data || [],
      meta: result.meta, // 包含 pagination 資訊
    });
  } catch (error: unknown) {
    return handleError(error, res, "取得 order 失敗");
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
        error: "找不到此訂單",
      });
    }

    res.json({
      data: data[0], // 回傳單筆資料
    });
  } catch (error: unknown) {
    return handleError(error, res, "取得訂單失敗");
  }
}

// 取得黑貓 carrier_id
let BlackCatCarrierId: string | null = null;

async function getBlackCatCarrierId() {
  if (BlackCatCarrierId) return BlackCatCarrierId;

  const carriers = await getAvailableCarriers();
  const blackcat = carriers.find((c) => c.name.includes("黑貓"));
  if (!blackcat) throw new Error("找不到黑貓宅急便 carrier_id");

  BlackCatCarrierId = blackcat.id;
  return blackcat.id;
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

    // 用前端傳來的 order_number 去資料庫查詢訂單（取得 documentId )
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
    // 檢查 documentId 是否存在
    if (!order.documentId) {
      console.error("❌ 警告：documentId 不存在，訂單資料:", order);
      return res.status(500).json({
        error: "訂單缺少 documentId",
        order: order,
      });
    }

    // ✅ 匯入 Track.tw，拿 uuid (Track.tw自己產生的唯一代號，因為物流編號可能重複，所以用 uuid 辨識)
    let uuid: string | null = null;
    try {
      const carrier_id = await getBlackCatCarrierId();
      const result = await importPackages(
        carrier_id,
        [tracking_number],
        "inactive",
      );

      console.log("📦 Track.tw API 回傳結果:", JSON.stringify(result, null, 2));

      // ✅ 直接賦值給外層定義好的變數
      const upperKey = tracking_number.toUpperCase();
      uuid = result[upperKey] || null;

      // 如果是假單號，result[upperKey] 可能不存在
      if (!uuid) {
        console.warn("⚠️ Track.tw 回傳結果中找不到對應單號的 UUID:", result);
      }
    } catch (trackErr) {
      console.error("❌ Track.tw 整合過程出錯 (跳過物流同步):", trackErr);
      // 這裡不 return，確保 Strapi 依然能更新
    }

    // 準備要更新的內容(物流編號和出貨時間)，並把訂單狀態改成shipped
    const updateData: Record<string, any> = {
      tracking_number,
      shipped_at,
      order_status: "shipped",
    };

    // 如果有拿到 uuid 才加入更新
    if (uuid) {
      updateData.UUID = uuid;
    }

    // 用 documentId 更新訂單（真正修改），必須用 documentId （Strapi API 限制）
    const updatedOrder = await putStrapiData(
      "orders",
      order.documentId,
      updateData,
    );

    // 更新成功 → 回傳給前端
    res.json({
      success: true,
      message: uuid
        ? "出貨資訊更新成功並已同步物流"
        : "出貨資訊已更新 (物流同步失敗)",
      trackTwStatus: uuid ? "success" : "failed",
      data: updatedOrder,
    });
  } catch (error: unknown) {
    return handleError(error, res, "更新出貨資訊失敗");
  }
}

// =========================================================
// 以下為新增的同步物流狀態功能
// =========================================================

// 抓取Track.tw 最新資料，同步訂單狀態
async function syncOrderLogisticsCore(order: any) {
  if (!order.UUID || !order.documentId) return { updated: false, order };

  // 1. 抓取 Track.tw 最新資料
  const tracking = await getTrackingByUuid(order.UUID);
  const histories = tracking?.package_history ?? [];

  if (histories.length === 0) return { updated: false, order, tracking };

  // 2. 找出最新的一筆 (修正日期排序問題)
  const latest = [...histories].sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  )[0];

  const checkpoint = latest?.checkpoint_status?.toLowerCase();

  // 3. 判斷是否需要更新狀態為 delivered
  if (checkpoint === "delivered" && order.order_status !== "delivered") {
    const updated = await putStrapiData("orders", order.documentId, {
      order_status: "delivered",
    });
    return { updated: true, order: updated, latest, tracking };
  }

  return { updated: false, order, latest, tracking };
}

// 批量更新物流狀態
export async function bulkSyncLogisticsHandler(req: Request, res: Response) {
  try {
    // 撈出所有「配送中」且「有 UUID」的訂單
    const result = await fetchStrapiData("orders", "*", 1, 500, {
      filters: {
        order_status: { $eq: "shipped" },
        UUID: { $notNull: true },
      },
      includeMeta: true,
    });

    const orders = result.data || [];
    if (orders.length === 0) {
      return res.json({
        success: true,
        message: "目前沒有配送中的訂單需要同步。",
      });
    }

    let updatedCount = 0;

    // 跑迴圈逐筆處理
    for (const order of orders) {
      const syncRes = await syncOrderLogisticsCore(order);
      if (syncRes.updated) updatedCount++;

      // 💡 保護機制：每筆停 500ms，避免被 Track.tw 封鎖
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    res.json({
      success: true,
      message: `批量同步完成！掃描 ${orders.length} 筆，其中 ${updatedCount} 筆更新為已送達。`,
    });
  } catch (error: unknown) {
    return handleError(error, res, "批量同步失敗");
  }
}

// 進入單一訂單詳情頁才查物流狀態
export async function getOrderTrackingHandler(req: Request, res: Response) {
  try {
    const { order_number } = req.params;

    // 1. 先從 Strapi 拿到訂單基本資訊
    const orders = await fetchStrapiData("orders", "*", 1, 1000, {
      filters: { order_number: { $eq: order_number } },
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: "找不到此訂單" });
    }

    const order = orders[0];

    // 2. 檢查是否有 UUID (沒出貨就不會有物流資訊)
    if (!order.UUID) {
      return res.status(200).json({
        success: false,
        message: "此訂單尚未出貨或無物流追蹤編號",
        order,
      });
    }

    // 3. 執行同步邏輯
    const result = await syncOrderLogisticsCore(order);

    // 4. 回傳前端需要的物流詳細資訊
    res.json({
      success: true,
      checkpoint_status: result.latest?.checkpoint_status ?? null,
      status_text: result.latest?.status ?? null,
      latest: result.latest,
      tracking: result.tracking,
      order: result.order, // 回傳可能是更新後的 order
      is_status_changed: result.updated,
    });
  } catch (error: unknown) {
    return handleError(error, res, "取得物流狀態失敗");
  }
}
