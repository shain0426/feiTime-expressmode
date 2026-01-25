import { Request, Response, NextFunction } from "express";
import { fetchStrapiData, putStrapiData } from "@/services/dataService";
import { handleError } from "@/utils/errorHandler";
import { getAvailableCarriers, importPackages } from "@/services/trackService";

// let BlackCatCarrierId: string | null = null;

// // 取得黑貓 carrier_id
// async function getBlackCatCarrierId() {
//   if (BlackCatCarrierId) return BlackCatCarrierId;

//   const carriers = await getAvailableCarriers();
//   const blackcat = carriers.find((c) => c.name.includes("黑貓"));
//   if (!blackcat) throw new Error("找不到黑貓宅急便 carrier_id");

//   BlackCatCarrierId = blackcat.id;
//   return blackcat.id;
// }

// export async function markShipped(
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) {
//   try {
//     const { order_number } = req.params;
//     const { tracking_number, shipped_at } = req.body as {
//       tracking_number?: string;
//       shipped_at?: string;
//     };

//     // 1) 確認物流單號是否存在
//     if (!tracking_number) {
//       return res
//         .status(400)
//         .json({ success: false, message: "沒有tracking_number" });
//     }

//     const order = await fetchStrapiData("orders", "*", 1, 1, {
//       filters: {
//         tracking_number: { $eq: tracking_number }, // 根據 tracking_number 篩選
//       },
//     });

//     if (!order || order.length === 0) {
//       return res
//         .status(404)
//         .json({ success: false, message: "物流單號不存在" });
//     }

//     // 2) 匯入 Track.tw，拿 uuid (Track.tw自己產生的唯一代號，因為物流編號可能重複，所以用 uuid 辨識)
//     const carrier_id = await getBlackCatCarrierId();
//     const result = await importPackages({
//       carrier_id,
//       tracking_numbers: [tracking_number],
//       notify_state: "inactive",
//     });

//     const uuid = result[tracking_number.toUpperCase()];
//     if (!uuid) {
//       return res.status(502).json({
//         success: false,
//         message: "Track.tw 已匯入但 uuid 不存在",
//         result,
//       });
//     }

//     // 3) 把 uuid 存回訂單
//     const updatedOrder  = await updateOrder(id, { track_uuid: uuid });

//     return res.json({
//       success: true,
//       track_uuid: uuid,
//       // order: updated
//     });
//   } catch (e) {
//     next(e);
//   }
// }

// export async function getOrderTrackingHandler(req: Request, res: Response) {
//   try {
//     const { order_number } = req.params;

//     const orders = await fetchStrapiData("orders", "*", 1, 1, {
//       filters: { order_number: { $eq: order_number } },
//     });

//     if (!orders || orders.length === 0) {
//       return res.status(404).json({ error: "找不到此訂單" });
//     }

//     const order = orders[0];
//     if (!order.documentId) {
//       return res.status(500).json({ error: "訂單缺少 documentId", order });
//     }

//     if (!order.UUID) {
//       return res.status(400).json({ error: "此訂單尚未建立 Track.tw UUID（可能尚未出貨/未匯入）" });
//     }

//     // ✅ 進頁才查 Track.tw
//     const tracking = await getTrackingByUuid(order.UUID);

//     const histories = tracking?.package_history ?? [];
//     const latest = [...histories].sort((a, b) => (b.time ?? 0) - (a.time ?? 0))[0];

//     const checkpoint = latest?.checkpoint_status ?? null; // delivered / transit...
//     const statusText = latest?.status ?? null;

//     let updatedOrder = order;
//     if (checkpoint === "delivered" && order.order_status !== "completed") {
//       updatedOrder = await putStrapiData("orders", order.documentId, {
//         order_status: "completed",
//       });
//     }

//     res.json({
//       success: true,
//       checkpoint_status: checkpoint,
//       status_text: statusText,
//       latest,
//       tracking,
//       order: updatedOrder,
//     });
//   } catch (error: unknown) {
//     return handleError(error, res, "取得物流狀態失敗");
//   }
// }
