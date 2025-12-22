import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.DATABASE_URL!,
  process.env.DATABASE_SERVICE_ROLE_KEY!
);

const strapiClient = axios.create({
  baseURL: process.env.STRAPI_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.STRAPI_API_TOKENE}`,
  },
});

export const fetchStrapiData = async (
  collectionName: string,
  populate = "*"
) => {
  try {
    const res = await strapiClient.get(
      `/${collectionName}?populate=${populate}`
    );
    return res.data;
  } catch (err: any) {
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
