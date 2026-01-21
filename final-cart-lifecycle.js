
const axios = require('axios');

const API_URL = 'http://localhost:4000/api/cart';
const USER_DOC_ID = 'k2zy199bfo89mgjb9ey2d6f4';
const PRODUCT_DOC_ID = 'zlrnxtbkkwy6o5phjggw5gc8';

async function runLifecycle() {
    console.log('🚀 Starting Final Cart Lifecycle Test...\n');
    let cartItemId = null;

    // 1. ADD Item
    console.log('1️⃣  Action: Add to Cart');
    try {
        const payload = {
            user: USER_DOC_ID,
            product: PRODUCT_DOC_ID,
            quantity: 1,
            snapshot_name: 'Lifecycle Test Coffee',
            snapshot_price: 300,
            snapshot_weight: 'Half Pound',
            snapshot_image: 'https://ignored-anyway.com/image.jpg', // Should be stripped by backend for now
            item_total: 300
        };
        const res = await axios.post(API_URL, payload);
        console.log('   ✅ Success! Created ID:', res.data.id, 'DocumentId:', res.data.documentId);
        cartItemId = res.data.documentId;
    } catch (err) {
        console.error('   ❌ Add Failed:', err.response?.data || err.message);
        return;
    }

    if (!cartItemId) return;

    // 2. FETCH List (Verify it's there)
    console.log('\n2️⃣  Action: Fetch Cart List (GET)');
    try {
        const res = await axios.get(`${API_URL}?userId=${22}`); // Assuming User ID 22 from previous logs

        // Debug: Log structure
        // console.log('   Create response structure:', JSON.stringify(res.data, null, 2));

        // Strapi v5 often returns { data: [...], meta: ... } OR just [...] depending on controller
        const list = Array.isArray(res.data) ? res.data : (res.data.data || []);

        console.log(`   Fetched ${list.length} items.`);

        const found = list.find(item => item.documentId === cartItemId);
        if (found) {
            console.log('   ✅ Item found in list.');
            console.log('      Quantity:', found.quantity);
        } else {
            console.warn('   ⚠️ Item NOT found in list. Check userId match?');
        }
    } catch (err) {
        console.error('   ❌ Fetch Failed:', err.response?.data || err.message);
    }

    // 3. UPDATE Item
    console.log('\n3️⃣  Action: Update Quantity (PUT)');
    try {
        const updatePayload = {
            quantity: 5,
            item_total: 1500
        };
        const res = await axios.put(`${API_URL}/${cartItemId}`, updatePayload);
        console.log('   ✅ Update Success! New Quantity:', res.data.quantity);
    } catch (err) {
        console.error('   ❌ Update Failed:', err.response?.data || err.message);
    }

    // 4. DELETE Item
    console.log('\n4️⃣  Action: Delete Item');
    try {
        await axios.delete(`${API_URL}/${cartItemId}`);
        console.log('   ✅ Delete Success!');
    } catch (err) {
        console.error('   ❌ Delete Failed:', err.response?.data || err.message);
    }

    console.log('\n🎉 Lifecycle Test Complete!');
}

runLifecycle();
