const fs = require('fs');
const path = require('path');
const clientsDb = require('./clientsDb');

const dbFile = path.join(__dirname, '../loadtest-history.json');
const defaultData = { tests: [] };

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

function addTestEntry(entry) {
    const data = readData();
    const activeClient = clientsDb.getActiveClient();
    entry.clientId = entry.clientId || activeClient;
    entry.timestamp = entry.timestamp || new Date().toISOString();
    data.tests.unshift(entry);
    // Keep last 100 entries
    if (data.tests.length > 100) data.tests = data.tests.slice(0, 100);
    writeData(data);
}

function getTestById(testId) {
    const data = readData();
    return data.tests.find(t => t.id === testId) || null;
}

function getTestHistory(limit = 50) {
    const data = readData();
    const activeClient = clientsDb.getActiveClient();
    let tests = data.tests;
    if (activeClient && activeClient !== 'all') {
        tests = tests.filter(t => t.clientId === activeClient);
    }
    return tests.slice(0, limit);
}

module.exports = {
    addTestEntry,
    getTestById,
    getTestHistory
};
