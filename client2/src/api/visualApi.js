import axios from 'axios';

// Use relative URLs - Vite proxy will handle routing to the backend
const API_BASE_URL = '/api/visual';
const STATIC_BASE_URL = '/visual-public';

export const runTest = async (url, routes, authConfig = {}) => {
    const response = await axios.post(`${API_BASE_URL}/test`, {
        url,
        routes,
        requiresAuth: authConfig.requiresAuth,
        mobile: authConfig.mobile,
        password: authConfig.password,
        customHeaders: authConfig.customHeaders
    });
    return response.data;
};

export const getReports = async () => {
    const response = await axios.get(`${API_BASE_URL}/reports`);
    return response.data;
};

export const getReport = async (id) => {
    const response = await axios.get(`${API_BASE_URL}/reports/${id}`);
    return response.data;
};

export const downloadReport = async (id) => {
    const response = await axios.get(`${API_BASE_URL}/reports/${id}/download`, {
        responseType: 'blob'
    });
    return response.data;
};

export const deleteReport = async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/reports/${id}`);
    return response.data;
};

// Routes Management
export const getRoutes = async (domain) => {
    const response = await axios.get(`${API_BASE_URL}/routes/${domain}`);
    return response.data;
};

export const saveRoute = async (domain, route) => {
    const response = await axios.post(`${API_BASE_URL}/routes/${domain}`, { route });
    return response.data;
};

// Baseline Management
export const getBaselines = async (domain) => {
    const response = await axios.get(`${API_BASE_URL}/baselines/${domain}`);
    return response.data;
};

export const uploadBaseline = async (domain, routeName, viewport, file) => {
    const formData = new FormData();
    formData.append('domain', domain);
    formData.append('routeName', routeName);
    formData.append('viewport', viewport);
    formData.append('image', file);

    const response = await axios.post(`${API_BASE_URL}/baselines/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const deleteBaseline = async (domain, filename) => {
    const response = await axios.delete(`${API_BASE_URL}/baselines/${domain}/${filename}`);
    return response.data;
};

// Authentication Management
export const getAuthConfig = async (domain) => {
    const response = await axios.get(`${API_BASE_URL}/auth/${domain}`);
    return response.data;
};

export const saveAuthConfig = async (domain, config) => {
    const response = await axios.post(`${API_BASE_URL}/auth/${domain}`, config);
    return response.data;
};

export const deleteAuthConfig = async (domain) => {
    const response = await axios.delete(`${API_BASE_URL}/auth/${domain}`);
    return response.data;
};

export const getScreenshotUrl = (filename) => `${STATIC_BASE_URL}/${filename}`;
