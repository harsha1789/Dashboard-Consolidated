const express = require('express');
const router = express.Router();
const usersDb = require('../config/usersDb');

// Login / Authenticate user
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = usersDb.authenticateUser(username, password);

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users (admin only in future)
router.get('/', (req, res) => {
    try {
        const users = usersDb.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user by ID
router.get('/:userId', (req, res) => {
    try {
        const user = usersDb.getUserById(req.params.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new user
router.post('/', (req, res) => {
    try {
        const { username, password, email, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const newUser = usersDb.createUser({ username, password, email, role });
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update user
router.put('/:userId', (req, res) => {
    try {
        const updatedUser = usersDb.updateUser(req.params.userId, req.body);
        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update user stats
router.post('/:userId/stats', (req, res) => {
    try {
        const stats = usersDb.updateUserStats(req.params.userId, req.body);
        if (!stats) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Increment user stats (after test run)
router.post('/:userId/stats/increment', (req, res) => {
    try {
        const { passed } = req.body;
        const stats = usersDb.incrementUserStats(req.params.userId, passed);
        if (!stats) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
router.delete('/:userId', (req, res) => {
    try {
        usersDb.deleteUser(req.params.userId);
        res.json({ success: true });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
