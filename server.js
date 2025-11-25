
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'database_v3.json');

app.use(cors());
app.use(bodyParser.json());

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

const saveDb = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const db = getDb();
    if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Username exists' });
    }
    const newUser = {
        username,
        passwordHash: password,
        maxLevel: 1,
        highScore: 0,
        coins: 0,
        inventory: {},
        perks: { extraHints: 0, extraShuffles: 0 }
    };
    db.users.push(newUser);
    saveDb(db);
    res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = getDb();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && user.passwordHash === password) {
        // Return full user object (excluding password)
        const { passwordHash, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/user/update', (req, res) => {
    const { username, stats } = req.body;
    if (!username || !stats) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const db = getDb();
    const userIndex = db.users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());

    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = db.users[userIndex];
    
    // Update fields if present in stats
    if (stats.maxLevel && stats.maxLevel > (user.maxLevel || 0)) user.maxLevel = stats.maxLevel;
    if (stats.highScore && stats.highScore > (user.highScore || 0)) user.highScore = stats.highScore;
    
    if (stats.addCoins) user.coins = (user.coins || 0) + stats.addCoins;
    if (stats.spendCoins) user.coins = Math.max(0, (user.coins || 0) - stats.spendCoins);
    
    if (stats.addItems) {
        user.inventory = user.inventory || {};
        Object.entries(stats.addItems).forEach(([item, count]) => {
            user.inventory[item] = (user.inventory[item] || 0) + Number(count);
        });
    }

    if (stats.upgradePerk) {
        user.perks = user.perks || { extraHints: 0, extraShuffles: 0 };
        const perkName = stats.upgradePerk;
        user.perks[perkName] = (user.perks[perkName] || 0) + 1;
    }

    // Save back to DB
    db.users[userIndex] = user;
    saveDb(db);

    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
});

// Get Leaderboard
app.get('/api/leaderboard', (req, res) => {
    const db = getDb();
    const rankedUsers = db.users
        .map(u => ({
            name: u.username,
            maxLevel: u.maxLevel || 1,
            score: u.highScore || 0,
            avatar: '👤'
        }))
        .sort((a, b) => {
            if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
            return b.score - a.score;
        })
        .slice(0, 10);

    const result = rankedUsers.map((u, index) => ({ ...u, rank: index + 1 }));
    res.json(result);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
