import axios from "axios";
import express from "express";
import "dotenv/config";
import CryptoJS from "crypto-js";
import cors from "cors";
import { Request, Response } from "express";
import { handleError } from "@/utils/errorHandler";

const LINEPAY_CHANNEL_ID = process.env.LINEPAY_CHANNEL_ID;
const LINEPAY_CHANNEL_SECRET = process.env.LINEPAY_CHANNEL_SECRET;
const LINEPAY_SITE = process.env.LINEPAY_DEV; // linepay測試網址
const FEITIME = process.env.MAE; // 前端網址

const app = express();
app.use(cors());
app.use(express.json());

interface LinePayProduct {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
}

interface CartProduct {
  product: {
    id: string | number;
    name: string;
    price: number;
  };
  quantity: number;
}

function createSignature(uri: string, body: Record<string, unknown>) {
  const nonce = Date.now().toString();
  const bodyString = JSON.stringify(body);
  const string = LINEPAY_CHANNEL_SECRET + uri + bodyString + nonce;
  const signature = CryptoJS.HmacSHA256(
    string,
    LINEPAY_CHANNEL_SECRET,
  ).toString(CryptoJS.enc.Base64);

  return { signature: signature, nonce: nonce };
}

// 付款請求
export const linepayRequest = async (req: Request, res: Response) => {
  const amount = Number(req.body.amount);
  const products = req.body.products as CartProduct[];

  const uri = "/v3/payments/request"; // 付款請求 POST 要傳送過去的路由

  const lineProducts = products.map((p: CartProduct) => ({
    id: p.product.id,
    name: p.product.name,
    quantity: Number(p.quantity),
    price: Number(p.product.price),
  }));

  lineProducts.push({
    id: "shipping_fee",
    name: "運費",
    quantity: 1,
    price: 250,
  });

  const caleSum = lineProducts.reduce(
    (sum, obj) => sum + obj.price * obj.quantity,
    0,
  );

  const order = {
    amount: amount,
    currency: "TWD",
    orderId: `feitime_kaimonorisuto${Date.now()}`,
    packages: [
      {
        id: "pkg_1",
        amount: Number(caleSum),
        products: lineProducts,
      },
    ],
    redirectUrls: {
      confirmUrl: `${FEITIME}/payment-wait`,
      cancelUrl: `${FEITIME}/payment-cancel`,
    },
  };

  const { signature, nonce } = createSignature(uri, order); // 使用解構

  const url = `https://sandbox-api-pay.line.me${uri}`;

  try {
    const response = await axios.post(url, order, {
      headers: {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": process.env.LINEPAY_CHANNEL_ID,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": signature,
      },
    });

    res.json(response.data);
  } catch (error: unknown) {
    return handleError(error, res, "付款請求失敗");
  }
};

// 付款授權
export const linepayConfirmation = async (req: Request, res: Response) => {
  const transactionId = req.body.transactionId;

  const amount = Number(req.body.amount);

  const uri = `/v3/payments/${transactionId}/confirm`;

  const confirmBody = {
    amount: amount,
    currency: "TWD",
  };

  const { signature, nonce } = createSignature(uri, confirmBody);

  try {
    const response = await axios.post(`${LINEPAY_SITE}${uri}`, confirmBody, {
      headers: {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": LINEPAY_CHANNEL_ID,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": signature,
      },
    });

    if (response.data.returnCode === "0000") {
      res.json({
        status: "success",
        message: "✅ 正式扣款成功！錢入帳囉！",
        data: response.data.info,
        paymentDate: new Date().toISOString(),
      });
    } else {
      res.status(400).json({
        status: "error",
        message: "❌ 交易授權失敗，請檢查餘額或重新操作",
        returnCode: response.data.returnCode,
      });
    }
  } catch (error: unknown) {
    return handleError(error, res, "付款授權失敗");
  }
};
