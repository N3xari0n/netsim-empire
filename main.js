const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Routes
const { authRouter } = require('./server/auth');
const saveRouter = require('./server/save');
const creditsRouter = require('./server/credits');
const paymentRouter = require('./server/payment');
const leaderboardRouter = require('./server/leaderboard');

const app = express();
const PORT = process.env.PORT || 3456;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static frontend files from current directory
app.use(express.static(__dirname));

// API Routing
app.use('/api/auth', authRouter);
app.use('/api/saves', saveRouter);
app.use('/api/credits', creditsRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/leaderboard', leaderboardRouter);

// Fallback to index.html for SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` NetSim Empire v1.0 - Node Engine Active       `);
    console.log(` Running locally on: http://localhost:${PORT}  `);
    console.log(`===============================================`);
});
