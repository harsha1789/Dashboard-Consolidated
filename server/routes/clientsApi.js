const express = require('express');
const router = express.Router();
const clientsDb = require('../config/clientsDb');

// Get all clients and active client
router.get('/', (req, res) => {
    try {
        const data = clientsDb.readClients();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get active client
router.get('/active', (req, res) => {
    try {
        const activeClient = clientsDb.getActiveClient();
        const client = clientsDb.getClientById(activeClient);
        res.json({ activeClient, client });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Set active client
router.post('/active', (req, res) => {
    try {
        const { clientId } = req.body;
        if (!clientId) {
            return res.status(400).json({ error: 'clientId is required' });
        }
        const data = clientsDb.setActiveClient(clientId);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add new client
router.post('/', (req, res) => {
    try {
        const { name, baseUrl, description, environments } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Client name is required' });
        }
        const newClient = clientsDb.addClient({ name, baseUrl, description, environments });
        res.status(201).json(newClient);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update client
router.put('/:clientId', (req, res) => {
    try {
        const { clientId } = req.params;
        const updates = req.body;
        const updatedClient = clientsDb.updateClient(clientId, updates);
        res.json(updatedClient);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete client
router.delete('/:clientId', (req, res) => {
    try {
        const { clientId } = req.params;
        const data = clientsDb.deleteClient(clientId);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get client by ID
router.get('/:clientId', (req, res) => {
    try {
        const { clientId } = req.params;
        const client = clientsDb.getClientById(clientId);
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }
        res.json(client);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
