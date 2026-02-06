import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const registerLand = (data) => api.post('/land/register', data);
export const getLand = (id) => api.get(`/land/${id}`);
export const getQr = (id) => `http://localhost:5000/api/land/qr/${id}`;

export const uploadVideo = (formData) => api.post('/detect/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export const sendLiveFrame = (formData) => api.post('/detect/live-frame', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export const getHistory = (landId) => api.get(`/detect/history/${landId}`);
export const storeOnChain = (data) => api.post('/blockchain/store', data);
export const verifyExternalTransaction = (id, txHash) => api.post('/blockchain/verify-external', { id, tx_hash: txHash });

// New User Centric APIs
export const getUserProfile = (userId) => api.get(`/auth/profile/${userId}`);
export const getUserLands = (userId) => api.get(`/land/user/${userId}`);
export const getUserDetections = (userId) => api.get(`/detect/user/${userId}`);

export default api;
