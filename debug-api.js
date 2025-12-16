require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    // 1. Get seller user
    const seller = await prisma.user.findFirst({
        where: { email: 'seller@streamsales.com' }
    });

    if (!seller) {
        console.log('ERROR: seller@streamsales.com not found');
        await prisma.$disconnect();
        return;
    }

    console.log('Seller found:', seller.id, 'role:', seller.role);

    // 2. Create valid JWT token
    const token = jwt.sign(
        { userId: seller.id, role: seller.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    console.log('Token created successfully');

    // 3. Make API call
    return new Promise((resolve) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/seller/purchases?page=1&limit=1',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', async () => {
                console.log('\n=== API Response (Status:', res.statusCode, ') ===');
                try {
                    const json = JSON.parse(data);
                    if (json.data && json.data[0]) {
                        const purchase = json.data[0];
                        console.log('Purchase ID:', purchase.id);
                        console.log('Status:', purchase.status);
                        console.log('Product:', purchase.product?.name);
                        console.log('');
                        console.log('=== CREDENTIALS ===');
                        console.log('accountEmail:', purchase.product?.accountEmail);
                        console.log('accountPassword:', purchase.product?.accountPassword);
                    } else if (json.error) {
                        console.log('Error:', json.error);
                    } else {
                        console.log('Response:', JSON.stringify(json, null, 2).substring(0, 1000));
                    }
                } catch (e) {
                    console.log('Parse error:', e.message);
                    console.log('Raw response:', data.substring(0, 500));
                }
                await prisma.$disconnect();
                resolve();
            });
        });

        req.on('error', async (e) => {
            console.log('Request error:', e.message);
            await prisma.$disconnect();
            resolve();
        });

        req.end();
    });
}

debug().catch(async (e) => {
    console.error('Fatal error:', e);
    await prisma.$disconnect();
});
