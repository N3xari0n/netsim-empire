const express = require('express');
const db = require('./db');

const router = express.Router();

router.get('/', (req, res) => {
    // Top 10 users by Level (then XP)
    db.all(`
        SELECT username, xp, level, status 
        FROM users 
        WHERE status != 'suspended' AND status != 'deleted' 
        ORDER BY level DESC, xp DESC 
        LIMIT 10
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json({ success: true, leaderboard: rows || [] });
    });
});

module.exports = router;
