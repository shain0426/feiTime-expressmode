
const axios = require('axios');

const API_URL = 'http://localhost:4000/api/cart';

// Use correct Document IDs from the logs
const USER_DOC_ID = 'k2zy199bfo89mgjb9ey2d6f4';
const PRODUCT_DOC_ID = 'zlrnxtbkkwy6o5phjggw5gc8';

async function testExpress() {
    console.log('🧪 Testing Express API: POST /api/cart (Full Complex Payload)');

    // Payload matching what Frontend sends EXACTLY
    const payload = {
        user: USER_DOC_ID,
        product: PRODUCT_DOC_ID,
        quantity: 5,
        snapshot_name: '薩爾瓦多 帕卡瑪拉（中焙）', // Chinese characters
        snapshot_price: 520,
        // Real long URL
        snapshot_image: 'https://accessible-dogs-da5b6a029a.media.strapiapp.com/large_coffee_049_280b8a488f.webp',
        snapshot_weight: '250g',
        item_total: 2600
    };

    console.log('📤 Payload:', payload);

    try {
        const res = await axios.post(API_URL, payload);
        console.log('✅ Success! Data:', res.data);
    } catch (err) {
        console.error('❌ Failed.');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Error Message:', err.message);
        }
    }
}

testExpress();
