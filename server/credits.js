const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

// GET balance
router.get('/balance', requireAuth, (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ success: true, credits: req.user.credits || 0 });
});

// POST spend
router.post('/spend', requireAuth, (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(422).json({ error: 'Invalid spend amount' });
    }

    db.get(`SELECT credits FROM users WHERE id = ?`, [req.user.id], (err, row) => {
        if (err || !row) return res.status(500).json({ error: 'DB Error' });
        
        if (row.credits < amount) {
            return res.status(400).json({ error: 'Insufficient credits balance' });
        }

        db.serialize(() => {
            db.run(`UPDATE users SET credits = credits - ? WHERE id = ?`, [amount, req.user.id]);
            db.run(`INSERT INTO transactions (user_id, type, amount, currency) VALUES (?, 'spend', ?, 'INGAME')`, 
                [req.user.id, amount], function(err) {
                    db.get(`SELECT credits FROM users WHERE id = ?`, [req.user.id], (err, user) => {
                        res.json({ 
                            success: true, 
                            message: `Spent ${amount} credits`, 
                            new_balance: user.credits 
                        });
                    });
            });
        });
    });
});

module.exports = router;
