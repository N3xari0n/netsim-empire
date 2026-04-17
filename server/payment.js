const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

// Simulated GCash Payment Endpoint & Donations
// In production, this would generate a PayMongo/Xendit checkout URL and redirect the user.

router.post('/checkout', requireAuth, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { pack_id, amount_php, credits, is_donation } = req.body;
    
    if (!amount_php || isNaN(amount_php)) {
        return res.status(422).json({ error: 'Invalid amount' });
    }

    try {
        // PayMongo Authorization (Requires Base64 encoding of Secret Key)
        // Set this in your environment or replace directly here for production.
        const PAYMONGO_SK = process.env.PAYMONGO_SK || "sk_test_PLACEHOLDER_KEY";
        
        if (PAYMONGO_SK === "sk_test_PLACEHOLDER_KEY") {
             return res.json({
                 success: false,
                 error: 'Backend Configuration Required: Please insert your valid PayMongo Secret Key natively in server/payment.js to activate real-currency routing.'
             });
        }

        const authHeader = Buffer.from(PAYMONGO_SK + ":").toString('base64');
        
        const desc = is_donation ? 'NetSim Donation' : `Buy ${credits} NetSim Credits`;

        const options = {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                authorization: `Basic ${authHeader}`
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        amount: amount_php * 100, // API expects centavos
                        description: desc,
                        remarks: `netsim_${req.user.id}_${is_donation ? 'donate' : pack_id}`
                    }
                }
            })
        };

        const pmRes = await fetch('https://api.paymongo.com/v1/links', options);
        if (!pmRes.ok) {
            const errBody = await pmRes.text();
            console.error('PayMongo err:', errBody);
            throw new Error('Payment gateway error');
        }
        
        const pmData = await pmRes.json();
        const checkoutUrl = pmData.data.attributes.checkout_url;

        // In a real application, you would log the 'reference_number' in the DB here
        // and add credits once the PayMongo Webhook fires a successful payment event.

        res.json({
            success: true,
            checkout_url: checkoutUrl,
            message: 'Redirecting to secure payment portal...'
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Payment gateway configuration is missing or invalid.' });
    }
});

module.exports = router;
