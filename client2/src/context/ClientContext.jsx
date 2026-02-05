import React, { createContext, useContext, useState, useEffect } from 'react';

const ClientContext = createContext();

const API_BASE = 'http://localhost:3001/api';

export function ClientProvider({ children }) {
    const [clients, setClients] = useState([]);
    const [activeClient, setActiveClient] = useState('default');
    const [activeClientData, setActiveClientData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch clients on mount
    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await fetch(`${API_BASE}/clients`);
            const data = await response.json();
            setClients(data.clients || []);
            setActiveClient(data.activeClient || 'default');
            const active = data.clients?.find(c => c.id === data.activeClient);
            setActiveClientData(active || null);
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const switchClient = async (clientId) => {
        try {
            const response = await fetch(`${API_BASE}/clients/active`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId })
            });
            const data = await response.json();
            setActiveClient(data.activeClient);
            const active = data.clients?.find(c => c.id === data.activeClient);
            setActiveClientData(active || null);
            setClients(data.clients || []);
        } catch (error) {
            console.error('Failed to switch client:', error);
        }
    };

    const addClient = async (clientData) => {
        try {
            const response = await fetch(`${API_BASE}/clients`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }
            const newClient = await response.json();
            await fetchClients(); // Refresh the list
            return newClient;
        } catch (error) {
            console.error('Failed to add client:', error);
            throw error;
        }
    };

    const updateClient = async (clientId, updates) => {
        try {
            const response = await fetch(`${API_BASE}/clients/${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }
            await fetchClients(); // Refresh the list
        } catch (error) {
            console.error('Failed to update client:', error);
            throw error;
        }
    };

    const deleteClient = async (clientId) => {
        try {
            const response = await fetch(`${API_BASE}/clients/${clientId}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }
            await fetchClients(); // Refresh the list
        } catch (error) {
            console.error('Failed to delete client:', error);
            throw error;
        }
    };

    return (
        <ClientContext.Provider value={{
            clients,
            activeClient,
            activeClientData,
            loading,
            switchClient,
            addClient,
            updateClient,
            deleteClient,
            refreshClients: fetchClients
        }}>
            {children}
        </ClientContext.Provider>
    );
}

export function useClient() {
    const context = useContext(ClientContext);
    if (!context) {
        throw new Error('useClient must be used within a ClientProvider');
    }
    return context;
}
