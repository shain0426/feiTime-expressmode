
const axios = require('axios');
require('dotenv').config();

const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const TOKEN = process.env.STRAPI_API_TOKEN;

// Replace these with the valid Document IDs captured from your logs
const USER_DOC_ID = 'k2zy199bfo89mgjb9ey2d6f4';
const PRODUCT_DOC_ID = 'zlrnxtbkkwy6o5phjggw5gc8';

const client = axios.create({
    baseURL: STRAPI_URL,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
    }
});

async function testPayload(name, payload) {
    console.log(`\n🧪 Testing Payload: ${name}`);
    console.log(JSON.stringify(payload, null, 2));
    try {
        const res = await client.post('/api/cart-items', { data: payload });
        console.log('✅ Success! Response:', res.data);
    } catch (err) {
        console.error('❌ Failed.');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Error:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error(err.message);
        }
    }
}

async function run() {
    // Test 1: Standard v5 (Direct String)
    await testPayload('Direct String', {
        user: USER_DOC_ID,
        product: PRODUCT_DOC_ID,
        quantity: 1,
        snapshot_name: 'Test Direct',
        snapshot_price: 100,
        item_total: 100
    });

    // Test 2: Standard v5 (Array of Strings - for many-to-many check)
    await testPayload('Array of Strings', {
        user: [USER_DOC_ID],
        product: [PRODUCT_DOC_ID],
        quantity: 1,
        snapshot_name: 'Test Array',
        snapshot_price: 100,
        item_total: 100
    });

    // Test 3: Connect Syntax
    await testPayload('Connect Syntax', {
        user: { connect: [USER_DOC_ID] },
        product: { connect: [PRODUCT_DOC_ID] },
        quantity: 1,
        snapshot_name: 'Test Connect',
        snapshot_price: 100,
        item_total: 100
    });

    // Test 4: Field Name 'users_permissions_user'
    await testPayload('Alt Field Name', {
        users_permissions_user: USER_DOC_ID,
        product: PRODUCT_DOC_ID,
        quantity: 1,
        snapshot_name: 'Test Alt Name',
        snapshot_price: 100,
        item_total: 100
    });
}

run();
