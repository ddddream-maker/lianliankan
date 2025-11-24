import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup needed for ES modules to use __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Helper: Read Database
const getDb = () => {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = { users: [] };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData));
        return initialData;
    }
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { users: [] };
    }
};

// Helper: Write Database
const saveDb = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- Routes ---

// 1. Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// 2. Register
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const db = getDb();
    const existing = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (existing) {
        return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const newUser = {
        username,
        passwordHash: password, // In production, hash this!
        records: {}
    };

    db.users.push(newUser);
    saveDb(db);

    res.json({ success: true, user: { username, records: newUser.records } });
});

// 3. Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = getDb();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (user && user.passwordHash === password) {
        res.json({ success: true, user: { username: user.username, records: user.records } });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// 4. Update Score
app.post('/api/score', (req, res) => {
    const { username, difficulty, score, timeUsed } = req.body;
    const db = getDb();
    const userIndex = db.users.findIndex(u => u.username === username);

    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = db.users[userIndex];
    if (!user.records) user.records = {};

    const currentRec = user.records[difficulty];
    let updated = false;

    // Update logic: Higher score OR same score with lower time
    if (!currentRec || score > currentRec.score || (score === currentRec.score && timeUsed < currentRec.timeUsed)) {
        user.records[difficulty] = { score, timeUsed };
        updated = true;
        saveDb(db);
    }

    res.json({ success: true, updated, records: user.records });
});

// 5. Get Leaderboard (Top 10 by Score)
app.get('/api/leaderboard', (req, res) => {
    const { difficulty } = req.query; // 'easy', 'normal', 'hard' (default 'normal')
    const targetDiff = difficulty || 'normal';
    
    const db = getDb();
    
    // Filter users who have a record for this difficulty
    const rankedUsers = db.users
        .filter(u => u.records && u.records[targetDiff])
        .map(u => ({
            name: u.username,
            score: u.records[targetDiff].score,
            timeUsed: u.records[targetDiff].timeUsed,
            avatar: '👤' // You could add avatar logic later
        }))
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score; // Higher score first
            return a.timeUsed - b.timeUsed; // Lower time first
        })
        .slice(0, 10); // Top 10

    // Add rank
    const result = rankedUsers.map((u, index) => ({ ...u, rank: index + 1 }));

    res.json(result);
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
