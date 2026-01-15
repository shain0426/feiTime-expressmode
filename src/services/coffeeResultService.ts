import axios from "axios";

const STRAPI_URL = process.env.STRAPI_URL;

export const coffeeResultService = {
  async saveToStrapi(payload: any) {
    try {
      const response = await axios.post(
        `${STRAPI_URL}/api/coffee-results`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          data: {
            persona_name: payload.data.persona_name,
            persona_image: payload.data.persona_image,
            description: payload.data.description,
            acidity: Number(payload.data.acidity),
            sweetness: Number(payload.data.sweetness),
            body: Number(payload.data.body),
            aftertaste: Number(payload.data.aftertaste),
            clarity: Number(payload.data.clarity),
            user: 22,
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },
};
