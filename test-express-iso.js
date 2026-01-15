
const axios = require('axios');

const API_URL = 'http://localhost:4000/api/cart';

// IDs that were proven to work in Step 946
const USER_DOC_ID = 'k2zy199bfo89mgjb9ey2d6f4';
const PRODUCT_DOC_ID = 'zlrnxtbkkwy6o5phjggw5gc8';

const BASE_PAYLOAD = {
    user: USER_DOC_ID,
    product: PRODUCT_DOC_ID,
    quantity: 1,
    snapshot_name: 'Basic Test',
    snapshot_price: 100,
    item_total: 100
};

async function test(name, payloadOverride) {
    console.log(`\n🧪 Request: ${name}`);
    const payload = { ...BASE_PAYLOAD, ...payloadOverride };

    try {
        const res = await axios.post(API_URL, payload);
        console.log('✅ Success! ID:', res.data.id);
        return true;
    } catch (err) {
        console.error('❌ Failed');
        if (err.response) {
            console.error('Status:', err.response.status);
            if (err.response.data.details && err.response.data.details.error) {
                // Try to print the inner error message from Strapi
                console.error('Strapi Message:', err.response.data.details.error.message);
            } else if (err.response.data.error) {
                // Or the wrapper error
                console.error('Express Error:', err.response.data.error);
            }
        } else {
            console.error(err.message);
        }
        return false;
    }
}

async function run() {
    // 1. Baseline (Should Pass based on Step 946)
    await test('Baseline', {});

    // 2. Quantity Change
    await test('Quantity 5', { quantity: 5, item_total: 500 });

    // 3. Weight
    await test('Weight String', { snapshot_weight: '250g' });

    // 4. Chinese Name (Suspect)
    await test('Chinese Name', { snapshot_name: '薩爾瓦多 帕卡瑪拉（中焙）' });

    // 5. Long Image URL (Suspect)
    await test('Image URL', {
        snapshot_image: 'https://accessible-dogs-da5b6a029a.media.strapiapp.com/large_coffee_049_280b8a488f.webp'
    });

}

run();
