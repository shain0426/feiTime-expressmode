import axios from "axios";

const TRACK_TW_BASE = process.env.TRACK_TW_API_URL;
const TRACK_TW_KEY = process.env.TRACK_TW_API_KEY!;

export const trackTw = axios.create({
  baseURL: TRACK_TW_BASE,
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${TRACK_TW_KEY}`, //
  },
});

export type Carrier = { id: string; name: string; logo?: string };

// 取得物流廠商
export async function getAvailableCarriers(): Promise<Carrier[]> {
  const { data } = await trackTw.get("/carrier/available");
  return data;
}

/**
 * 回傳 { [trackingNumber]: uuid }
 * 例如 { "AB123": "uuid-..." }
 */
export async function importPackages(
  carrier_id: string,
  tracking_numbers: string[],
  notify_state: "inactive" | "active",
): Promise<Record<string, string>> {
  // Track.Tw格式，且物流編號必須大寫
  const body = {
    carrier_id,
    tracking_number: tracking_numbers.map((n) => n.toUpperCase()),
    notify_state,
  };

  // 匯入包裹
  const { data } = await trackTw.post("/package/import", body, {
    headers: { "Content-Type": "application/json" },
  });

  return data;
}

// 取得Track.Tw產生的唯一代碼UUID (因為物流編號可能重複，所以用UUID辨識)
export async function getTrackingByUuid(uuid: string) {
  const { data } = await trackTw.get(`/package/tracking/${uuid}`);
  return data;
}

// 取得黑貓 carrier_id
let BlackCatCarrierId: string | null = null;

export async function getBlackCatCarrierId() {
  if (BlackCatCarrierId) return BlackCatCarrierId;

  const carriers = await getAvailableCarriers();
  const blackcat = carriers.find((c) => c.name.includes("黑貓"));
  if (!blackcat) throw new Error("找不到黑貓宅急便 carrier_id");

  BlackCatCarrierId = blackcat.id;
  return blackcat.id;
}
