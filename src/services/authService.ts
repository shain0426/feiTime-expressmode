import axios from "axios";

const STRAPI_URL = process.env.STRAPI_URL;

const strapiClient = axios.create({
  baseURL: STRAPI_URL,
});

export const registerUser = async (userData: any) => {
  const response = await strapiClient.post(
    `${STRAPI_URL}/api/auth/local/register`,
    userData
  );
  return response.data;
};

export const sendConfirmationEmail = async (email: string) => {
  const response = await axios.post(
    `${process.env.STRAPI_URL}/api/auth/send-email-confirmation`,
    { email }
  );
  return response.data;
};
