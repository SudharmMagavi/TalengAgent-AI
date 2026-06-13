// client/src/services/api.js
import axios from 'axios';
import useStore from '../store/useStore'; // <-- NEW: Import your store directly

const API = axios.create({
    baseURL: 'http://localhost:5000', 
});

// --- THE INTERCEPTOR: Automatically attach the token to every request ---
API.interceptors.request.use((req) => {
    // Look directly inside Zustand for the token (No more local storage parsing!)
    const token = useStore.getState().user?.token;
    
    if (token) {
        req.headers.Authorization = `Bearer ${token}`;
    }
    
    return req;
});

// --- YOUR API ROUTES ---

export const getDashboardData = () => API.get('/api/interview/dashboard');

export const createAssessment = (formData) => API.post('/api/interview/upload', formData, {
    headers: {
        'Content-Type': 'multipart/form-data',
    }
});

export const getAssessment = (token) => API.get(`/api/interview/assessment/${token}`);

export const submitAssessment = (token, answers) => API.post(`/api/interview/grade/${token}`, { answers });

export default API;