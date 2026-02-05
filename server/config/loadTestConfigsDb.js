const fs = require('fs');
const path = require('path');
const clientsDb = require('./clientsDb');

const dbFile = path.join(__dirname, '../loadtest-configs.json');
const defaultData = { configs: [] };

function readData() {
    if (!fs.existsSync(dbFile)) {
        fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    try {
        return JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
    } catch (e) {
        return defaultData;
    }
}

function writeData(data) {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

function addConfig(config) {
    const data = readData();
    const activeClient = clientsDb.getActiveClient();
    const now = new Date().toISOString();
    const entry = {
        id: Date.now().toString(),
        clientId: activeClient,
        name: config.name || `Config ${data.configs.length + 1}`,
        provider: config.provider || null,
        targetUrl: config.targetUrl || '',
        selectedApis: config.selectedApis || [],
        loadConfig: config.loadConfig || {},
        customHeaders: config.customHeaders || [],
        createdAt: now,
        updatedAt: now
    };
    data.configs.unshift(entry);
    writeData(data);
    return entry;
}

function getConfigById(configId) {
    const data = readData();
    return data.configs.find(c => c.id === configId) || null;
}

function getAllConfigs(limit = 50) {
    const data = readData();
    const activeClient = clientsDb.getActiveClient();
    let configs = data.configs;
    if (activeClient && activeClient !== 'all') {
        configs = configs.filter(c => c.clientId === activeClient);
    }
    return configs.slice(0, limit);
}

function updateConfig(configId, updates) {
    const data = readData();
    const index = data.configs.findIndex(c => c.id === configId);
    if (index === -1) return null;

    delete updates.id;
    delete updates.clientId;
    delete updates.createdAt;

    data.configs[index] = {
        ...data.configs[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };
    writeData(data);
    return data.configs[index];
}

function deleteConfig(configId) {
    const data = readData();
    const before = data.configs.length;
    data.configs = data.configs.filter(c => c.id !== configId);
    if (data.configs.length === before) return false;
    writeData(data);
    return true;
}

module.exports = {
    addConfig,
    getConfigById,
    getAllConfigs,
    updateConfig,
    deleteConfig
};
