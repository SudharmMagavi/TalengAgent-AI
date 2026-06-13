// client/src/store/useStore.js
import { create } from 'zustand';

// Safely parse local storage to prevent fatal React crashes
const getInitialUser = () => {
    try {
        // CHANGED: Now looking for the specific HR user data
        const userString = localStorage.getItem('hrUser');
        return userString ? JSON.parse(userString) : null;
    } catch (error) {
        console.error("Corrupted HR user data found in local storage. Clearing it.");
        localStorage.removeItem('hrUser'); 
        return null;
    }
};

const useStore = create((set) => ({
    // --- Auth State ---
    user: getInitialUser(),
    
    // CHANGED: Login now accepts the user data AND the token
    login: (userData, token) => {
        localStorage.setItem('hrUser', JSON.stringify(userData));
        localStorage.setItem('hrToken', token);
        set({ user: userData });
    },
    
    // CHANGED: Logout clears everything, including the secure token
    logout: () => {
        localStorage.removeItem('hrUser');
        localStorage.removeItem('hrToken');
        set({ user: null, questions: [] });
    },

    // --- Interview State ---
    questions: [],
    
    setQuestions: (newQuestions) => {
        set({ questions: newQuestions });
    }
}));

export default useStore;