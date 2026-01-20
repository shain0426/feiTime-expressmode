import { createStrapiData } from "@/services/dataService";

/**
 * 咖啡測驗結果資料結構
 */
interface CoffeeResultPayload {
  data: {
    persona_name: string;
    persona_image: string;
    description: string;
    acidity: number;
    sweetness: number;
    body: number;
    aftertaste: number;
    clarity: number;
    user?: number;
  };
}

export const coffeeResultService = {
  /**
   * 儲存咖啡測驗結果到 Strapi
   * @param payload - 咖啡測驗結果資料
   * @returns Strapi 回應資料
   */
  async saveToStrapi(payload: CoffeeResultPayload) {
    return await createStrapiData("coffee-results", {
      data: {
        persona_name: payload.data.persona_name,
        persona_image: payload.data.persona_image,
        description: payload.data.description,
        acidity: Number(payload.data.acidity),
        sweetness: Number(payload.data.sweetness),
        body: Number(payload.data.body),
        aftertaste: Number(payload.data.aftertaste),
        clarity: Number(payload.data.clarity), // ⚠️ 修正：原本是 aftertaste，應該是 clarity
        user: payload.data.user || 22,
      },
    });
  },
};
