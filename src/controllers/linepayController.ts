// 去開 ngrok  指令在env
import axios from "axios";
import express from "express";
import "dotenv/config";
import CryptoJS from "crypto-js";
import cors from "cors";

const LINEPAY_CHANNEL_ID = process.env.LINEPAY_CHANNEL_ID;
const LINEPAY_CHANNEL_SECRET = process.env.LINEPAY_CHANNEL_SECRET;
const LINEPAY_SITE = process.env.LINEPAY_DEV; // linepay測試網址
const FEITIME = process.env.MAE; // 前端網址

const app = express();
app.use(cors());
app.use(express.json());

function createSignature(uri, body) {
  const nonce = Date.now().toString();

  const bodyString = JSON.stringify(body);

  const string = LINEPAY_CHANNEL_SECRET + uri + bodyString + nonce;

  const signature = CryptoJS.HmacSHA256(
    string,
    LINEPAY_CHANNEL_SECRET,
  ).toString(CryptoJS.enc.Base64);

  return { signature: signature, nonce: nonce };
}

app.post("/linepay/gobuy", async (req, res) => {
  const amount = Number(req.body.amount);
  const products = req.body.products;

  const uri = "/v3/payments/request"; // 付款請求 POST 要傳送過去的路由

  const lineProducts = products.map((p) => ({
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
  } catch (error: any) {
    console.error("付款請求失敗", error.response?.data || error.message);
    res.status(500).json({
      status: "error",
      message: "網路或伺服器錯誤",
    });
  }
});

// linepay使用二階段授權機制
// 以下 app.post()為第二階段 處理付款和付款後的操作
app.post("/linePay/confirm", async (req, res) => {
  const transactionId = req.body.transactionId;

  const amount = Number(req.body.amount);

  const uri = `/v3/payments/${transactionId}/confirm`;

  const confirmBody = {
    amount: parseInt(amount),
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
  } catch (error) {
    console.error("付款授權失敗", error.response?.data || error.message);
    res.status(500).json({
      status: "error",
      message: "網路或伺服器錯誤",
    });
  }
});

app.listen(8080, () =>
  console.log("⭐ 我已經準備好當前端和linepay的媒人了 ：http://localhost:8080"),
);
