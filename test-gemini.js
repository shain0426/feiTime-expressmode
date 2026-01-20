// 測試 Gemini API
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGemini() {
  try {
    console.log('Testing Gemini API...');
    console.log('API Key exists:', !!GEMINI_API_KEY);

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: '請簡單回答：你好嗎？',
    });

    console.log('Success! Response:', response.text);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

testGemini();
