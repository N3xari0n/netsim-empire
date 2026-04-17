const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('./db');

const router = express.Router();

// Backup Code Algorithms
function generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 12; i++) {
        codes.push(crypto.randomBytes(6).toString('hex').toUpperCase()); // 12-char code
    }
    return codes;
}
function hashCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

// Helper to create session
function createSession(userId, res) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 30); // 30 days

    // Clean old sessions (keep max 2)
    db.run(`DELETE FROM sessions WHERE user_id = ? AND id NOT IN (
        SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 2
    )`, [userId, userId]);

    // Insert new session
    db.run(`INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`, 
        [userId, token, expires.toISOString()]);

    res.cookie('netsim_session', token, {
        expires: expires,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax'
    });

    return token;
}

// VPN Check helper
async function checkVPN(ip) {
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
        return false;
    }
    try {
        const fetch = (await import('node-fetch')).default; // Use dynamic import if node-fetch is needed, or native fetch in Node 18+
        const response = await globalThis.fetch(`https://ipapi.co/${ip}/json/`, {
            headers: { 'User-Agent': 'NetSimEmpire/2.0' },
            signal: AbortSignal.timeout(3000)
        });
        const data = await response.json();
        const org = (data.org || '').toLowerCase();
        const suspiciousOrgs = ['vpn', 'proxy', 'tunnel', 'tor', 'anonymous', 'hide', 'mask', 'nord', 'express', 'surfshark', 'cyberghost'];
        return suspiciousOrgs.some(keyword => org.includes(keyword));
    } catch (e) {
        return false;
    }
}

// REGISTER
router.post('/register', async (req, res) => {
    const { username, email, password, fingerprint, policy_accepted } = req.body;
    let errors = [];

    if (!username || username.length < 3 || username.length > 24) errors.push('Username must be 3-24 characters');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) errors.push('Username: letters, numbers, underscores only');
    if (!email || !/\S+@\S+\.\S+/.test(email)) errors.push('Invalid email address');
    if (!password || password.length < 6) errors.push('Password must be at least 6 characters');
    if (!policy_accepted) errors.push('You must accept the Privacy Policy & Game Agreement');
    if (!fingerprint) errors.push('Device fingerprint required');

    if (errors.length > 0) {
        return res.status(422).json({ error: 'Validation failed', details: errors });
    }

    // Check duplicate username/email
    db.get(`SELECT id FROM users WHERE username = ? OR email = ?`, [username, email], async (err, row) => {
        if (row) return res.status(409).json({ error: 'Username or email already taken' });

        // Check 1 account per device
        db.get(`SELECT user_id FROM device_registry WHERE fingerprint = ?`, [fingerprint], async (err, existing) => {
            if (existing) {
                return res.status(403).json({ 
                    error: 'This device already has an account registered. One account per device policy.',
                    code: 'DEVICE_LIMIT'
                });
            }

            const clientIP = req.ip || req.connection.remoteAddress || '127.0.0.1';
            const isVPN = await checkVPN(clientIP);
            const status = isVPN ? 'suspended' : 'active';
            
            const passwordHash = await bcrypt.hash(password, 10);
            const rawCodes = generateBackupCodes();
            const hashedCodes = JSON.stringify(rawCodes.map(hashCode));

            db.run(`
                INSERT INTO users (username, email, password_hash, device_fingerprint, registration_ip, is_vpn, status, policy_accepted, backup_codes)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
            `, [username, email, passwordHash, fingerprint, clientIP, isVPN ? 1 : 0, status, hashedCodes], function(err) {
                if (err) return res.status(500).json({ error: 'Database error' });
                
                const userId = this.lastID;

                // Bind Device
                db.run(`INSERT INTO device_registry (fingerprint, user_id) VALUES (?, ?)`, [fingerprint, userId]);
                
                // Starting Credits
                db.run(`UPDATE users SET credits = 100 WHERE id = ?`, [userId]);

                if (isVPN) {
                    return res.status(403).json({
                        error: 'VPN/Proxy detected! Your account has been suspended. Please register legitimately.',
                        code: 'VPN_DETECTED'
                    });
                }

                const token = createSession(userId, res);
                
                res.status(201).json({
                    success: true,
                    message: 'Account created! Welcome to NetSim Empire!',
                    user: { id: userId, username, credits: 100, status },
                    backupCodes: rawCodes,
                    token
                });
            });
        });
    });
});

// LOGIN
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(422).json({ error: 'Username and password required' });

    db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({ error: 'Account suspended. VPN/proxy was detected. Contact support.' });
        }

        db.run(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);
        
        const token = createSession(user.id, res);
        
        res.json({
            success: true,
            message: `Welcome back, ${user.username}!`,
            user: { id: user.id, username: user.username, credits: user.credits, status: user.status },
            token
        });
    });
});

// LOGOUT
router.get('/logout', (req, res) => {
    const token = req.cookies.netsim_session;
    if (token) {
        db.run(`DELETE FROM sessions WHERE token = ?`, [token]);
        res.clearCookie('netsim_session');
    }
    res.json({ success: true, message: 'Logged out' });
});

// ME Middleware helper (exports for other routes)
const requireAuth = (req, res, next) => {
    const token = req.cookies.netsim_session;
    if (!token) {
        req.user = null;
        return next();
    }
    
    db.get(`
        SELECT u.id, u.username, u.email, u.credits, u.status, u.xp, u.level 
        FROM users u 
        JOIN sessions s ON u.id = s.user_id 
        WHERE s.token = ? AND s.expires_at > CURRENT_TIMESTAMP
    `, [token], (err, user) => {
        req.user = user || null;
        next();
    });
};

router.get('/me', requireAuth, (req, res) => {
    if (!req.user) return res.json({ authenticated: false });
    res.json({ authenticated: true, user: req.user });
});

// PASSWORD RESET (Using Backup Codes)
router.post('/reset', (req, res) => {
    const { username, backupCode, newPassword } = req.body;
    if (!username || !backupCode || !newPassword || newPassword.length < 6) return res.status(400).json({error: 'Invalid input'});

    const hashedInput = hashCode(backupCode.toUpperCase().replace(/\\s/g, ''));

    db.get(`SELECT id, backup_codes FROM users WHERE username = ?`, [username], async (err, user) => {
        if (!user) return res.status(404).json({error: 'User not found'});
        if (!user.backup_codes) return res.status(403).json({error: 'No backup codes configured for this account'});
        
        let codes;
        try { codes = JSON.parse(user.backup_codes); } catch(e) { codes = []; }
        
        const codeIndex = codes.indexOf(hashedInput);
        if (codeIndex === -1) {
            return res.status(401).json({error: 'Invalid or already used Backup Code'});
        }

        // Consume Code
        codes.splice(codeIndex, 1);
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        db.run(`UPDATE users SET password_hash = ?, backup_codes = ? WHERE id = ?`, 
            [newPasswordHash, JSON.stringify(codes), user.id], 
            (err) => {
            if (err) return res.status(500).json({error: 'Database error'});
            db.run(`DELETE FROM sessions WHERE user_id = ?`, [user.id]);
            res.json({success: true, message: 'Password reset successfully.', codesRemaining: codes.length});
        });
    });
});

// REGENERATE CODES (Requires Auth + Current Password)
router.post('/settings/regenerate', requireAuth, (req, res) => {
    if (!req.user) return res.status(401).json({error: 'Unauthorized'});
    const { password } = req.body;
    
    db.get(`SELECT password_hash FROM users WHERE id = ?`, [req.user.id], async (err, user) => {
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        
        const rawCodes = generateBackupCodes();
        const hashedCodes = JSON.stringify(rawCodes.map(hashCode));
        
        db.run(`UPDATE users SET backup_codes = ? WHERE id = ?`, [hashedCodes, req.user.id], (err) => {
             if (err) return res.status(500).json({error: 'DB Error'});
             res.json({success: true, backupCodes: rawCodes});
        });
    });
});

// REQUEST ACCOUNT DELETION (Requires Auth + Password)
router.post('/settings/delete-request', requireAuth, (req, res) => {
    if (!req.user) return res.status(401).json({error: 'Unauthorized'});
    const { username, password } = req.body;
    
    if (username !== req.user.username) return res.status(401).json({error: 'Username mismatch'});
    
    db.get(`SELECT password_hash FROM users WHERE id = ?`, [req.user.id], async (err, user) => {
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: 'Invalid password' });
        }
        
        db.run(`UPDATE users SET deletion_requested = 1 WHERE id = ?`, [req.user.id], (err) => {
             if (err) return res.status(500).json({error: 'DB Error'});
             // Wipe their session visually
             db.run(`DELETE FROM sessions WHERE user_id = ?`, [req.user.id]);
             res.clearCookie('netsim_session');
             res.json({success: true, message: 'Account deletion requested. Session terminated.'});
        });
    });
});

module.exports = { authRouter: router, requireAuth };
