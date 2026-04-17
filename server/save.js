const express = require('express');
const db = require('./db');
const { requireAuth } = require('./auth');

const router = express.Router();

// GET saves
router.get('/', requireAuth, (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    db.all(`SELECT slot_id, updated_at FROM saves WHERE user_id = ? ORDER BY updated_at DESC`, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        res.json({ success: true, saves: rows || [] });
    });
});

// GET specific save
router.get('/:slot_id', requireAuth, (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    db.get(`SELECT state_json, updated_at FROM saves WHERE user_id = ? AND slot_id = ?`, 
    [req.user.id, req.params.slot_id], (err, row) => {
        if (err) return res.status(500).json({ error: 'DB Error' });
        if (!row) return res.status(404).json({ error: 'Save not found' });
        
        res.json({ success: true, state_json: row.state_json, updated_at: row.updated_at });
    });
});

// POST save (Upsert)
router.post('/', requireAuth, (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { slot_id, state_json } = req.body;
    if (!slot_id || !state_json) return res.status(422).json({ error: 'slot_id and state_json required' });

    // Extract xp and level from the JSON to update the leaderboard stats
    let xp = 0;
    let level = 1;
    try {
        const parsedState = JSON.parse(state_json);
        // The game state is wrapped inside a "state" object in the JSON
        if (parsedState && parsedState.state) {
            xp = parsedState.state.xp || 0;
            level = parsedState.state.level || 1;
        }
    } catch(e) {}

    db.serialize(() => {
        db.run(`
            INSERT INTO saves (user_id, slot_id, state_json) 
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, slot_id) DO UPDATE SET 
            state_json = excluded.state_json,
            updated_at = CURRENT_TIMESTAMP
        `, [req.user.id, slot_id, state_json], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to save' });
        });

        // Update user xp/level for leaderboard
        db.run(`UPDATE users SET xp = MAX(xp, ?), level = MAX(level, ?) WHERE id = ?`, 
            [xp, level, req.user.id], function(err) {
            res.json({ success: true, message: 'Game saved successfully' });
        });
    });
});

module.exports = router;
