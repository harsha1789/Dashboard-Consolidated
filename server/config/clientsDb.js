const fs = require('fs');
const path = require('path');

// Clients configuration file
const clientsFile = path.join(__dirname, '../clients.json');
const defaultData = {
    activeClient: 'default',
    clients: [
        {
            id: 'default',
            name: 'Default Project',
            baseUrl: '',
            description: 'Default project for testing',
            createdAt: new Date().toISOString(),
            environments: {
                dev: '',
                staging: '',
                prod: ''
            }
        }
    ]
};

function readClients() {
    if (!fs.existsSync(clientsFile)) {
        fs.writeFileSync(clientsFile, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(clientsFile, 'utf-8'));
}

function writeClients(data) {
    fs.writeFileSync(clientsFile, JSON.stringify(data, null, 2));
}

function getActiveClient() {
    const data = readClients();
    return data.activeClient;
}

function setActiveClient(clientId) {
    const data = readClients();
    const clientExists = data.clients.some(c => c.id === clientId);
    if (!clientExists) {
        throw new Error(`Client ${clientId} not found`);
    }
    data.activeClient = clientId;
    writeClients(data);
    return data;
}

function addClient(client) {
    const data = readClients();

    // Generate ID from name if not provided
    const id = client.id || client.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // Check if client already exists
    if (data.clients.some(c => c.id === id)) {
        throw new Error(`Client with ID ${id} already exists`);
    }

    const newClient = {
        id,
        name: client.name,
        baseUrl: client.baseUrl || '',
        description: client.description || '',
        createdAt: new Date().toISOString(),
        environments: client.environments || {
            dev: '',
            staging: '',
            prod: client.baseUrl || ''
        }
    };

    data.clients.push(newClient);
    writeClients(data);
    return newClient;
}

function updateClient(clientId, updates) {
    const data = readClients();
    const index = data.clients.findIndex(c => c.id === clientId);

    if (index === -1) {
        throw new Error(`Client ${clientId} not found`);
    }

    // Don't allow changing the ID
    delete updates.id;

    data.clients[index] = {
        ...data.clients[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    writeClients(data);
    return data.clients[index];
}

function deleteClient(clientId) {
    const data = readClients();

    // Don't allow deleting the default client
    if (clientId === 'default') {
        throw new Error('Cannot delete the default client');
    }

    const index = data.clients.findIndex(c => c.id === clientId);
    if (index === -1) {
        throw new Error(`Client ${clientId} not found`);
    }

    data.clients.splice(index, 1);

    // If deleted client was active, switch to default
    if (data.activeClient === clientId) {
        data.activeClient = 'default';
    }

    writeClients(data);
    return data;
}

function getClientById(clientId) {
    const data = readClients();
    return data.clients.find(c => c.id === clientId);
}

module.exports = {
    readClients,
    writeClients,
    getActiveClient,
    setActiveClient,
    addClient,
    updateClient,
    deleteClient,
    getClientById
};
