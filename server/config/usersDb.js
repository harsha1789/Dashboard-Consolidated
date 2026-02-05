const fs = require('fs');
const path = require('path');

// Users database file
const usersFile = path.join(__dirname, '../users.json');

const defaultData = {
    users: [
        {
            id: 'harsha',
            username: 'Harsha',
            password: 'Harsha',
            email: 'harsha@zensar.com',
            role: 'developer',
            avatar: null,
            createdAt: new Date().toISOString(),
            lastLogin: null,
            preferences: {
                theme: 'dark',
                defaultClient: 'default',
                notifications: true
            },
            stats: {
                totalTestRuns: 0,
                passedTests: 0,
                failedTests: 0,
                lastActivity: null
            }
        }
    ]
};

function readUsers() {
    if (!fs.existsSync(usersFile)) {
        fs.writeFileSync(usersFile, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
}

function writeUsers(data) {
    fs.writeFileSync(usersFile, JSON.stringify(data, null, 2));
}

function authenticateUser(username, password) {
    const data = readUsers();
    const user = data.users.find(u =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password
    );

    if (user) {
        // Update last login
        user.lastLogin = new Date().toISOString();
        writeUsers(data);

        // Return user without password
        const { password: _, ...safeUser } = user;
        return safeUser;
    }
    return null;
}

function getUserById(userId) {
    const data = readUsers();
    const user = data.users.find(u => u.id === userId);
    if (user) {
        const { password: _, ...safeUser } = user;
        return safeUser;
    }
    return null;
}

function getUserByUsername(username) {
    const data = readUsers();
    const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
        const { password: _, ...safeUser } = user;
        return safeUser;
    }
    return null;
}

function createUser(userData) {
    const data = readUsers();

    // Check if username already exists
    if (data.users.some(u => u.username.toLowerCase() === userData.username.toLowerCase())) {
        throw new Error('Username already exists');
    }

    const newUser = {
        id: userData.username.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        username: userData.username,
        password: userData.password,
        email: userData.email || '',
        role: userData.role || 'developer',
        avatar: userData.avatar || null,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        preferences: {
            theme: 'dark',
            defaultClient: 'default',
            notifications: true
        },
        stats: {
            totalTestRuns: 0,
            passedTests: 0,
            failedTests: 0,
            lastActivity: null
        }
    };

    data.users.push(newUser);
    writeUsers(data);

    const { password: _, ...safeUser } = newUser;
    return safeUser;
}

function updateUser(userId, updates) {
    const data = readUsers();
    const index = data.users.findIndex(u => u.id === userId);

    if (index === -1) {
        throw new Error('User not found');
    }

    // Don't allow changing ID
    delete updates.id;

    data.users[index] = {
        ...data.users[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    writeUsers(data);

    const { password: _, ...safeUser } = data.users[index];
    return safeUser;
}

function updateUserStats(userId, statsUpdate) {
    const data = readUsers();
    const index = data.users.findIndex(u => u.id === userId);

    if (index === -1) {
        return null;
    }

    data.users[index].stats = {
        ...data.users[index].stats,
        ...statsUpdate,
        lastActivity: new Date().toISOString()
    };

    writeUsers(data);
    return data.users[index].stats;
}

function incrementUserStats(userId, passed) {
    const data = readUsers();
    const index = data.users.findIndex(u => u.id === userId);

    if (index === -1) {
        return null;
    }

    data.users[index].stats.totalTestRuns++;
    if (passed) {
        data.users[index].stats.passedTests++;
    } else {
        data.users[index].stats.failedTests++;
    }
    data.users[index].stats.lastActivity = new Date().toISOString();

    writeUsers(data);
    return data.users[index].stats;
}

function getAllUsers() {
    const data = readUsers();
    return data.users.map(u => {
        const { password: _, ...safeUser } = u;
        return safeUser;
    });
}

function deleteUser(userId) {
    const data = readUsers();
    const index = data.users.findIndex(u => u.id === userId);

    if (index === -1) {
        throw new Error('User not found');
    }

    data.users.splice(index, 1);
    writeUsers(data);
    return true;
}

module.exports = {
    readUsers,
    writeUsers,
    authenticateUser,
    getUserById,
    getUserByUsername,
    createUser,
    updateUser,
    updateUserStats,
    incrementUserStats,
    getAllUsers,
    deleteUser
};
