// src/pages/AuthPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginOrganization, registerOrganization } from '../services/api';
import useStore from '../store/useStore';

const AuthPage = () => {
    // 1. Pull the login function from your Zustand store
    const login = useStore((state) => state.login); 
    
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        email: '',
        password: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); 

        try {
            // Call the appropriate function from your api.js service
            const { data } = isLogin 
                ? await loginOrganization({ email: formData.email, password: formData.password }) 
                : await registerOrganization(formData);

            // 2. Extract the token and the rest of the user data separately
            const { token, ...userData } = data;
            
            // 3. Pass them to Zustand (which now handles localStorage automatically!)
            login(userData, token);
            
            // Boom. Logged in. Send them to the dashboard.
            navigate('/dashboard');

        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    {isLogin ? 'Organization Login' : 'Register Organization'}
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    AI-Powered Technical Assessments
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {error && (
                        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {!isLogin && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                                    <input name="name" type="text" required value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Company Name</label>
                                    <input name="companyName" type="text" required value={formData.companyName} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email address</label>
                            <input name="email" type="email" required value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Password</label>
                            <input name="password" type="password" required value={formData.password} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>

                        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                            {isLogin ? 'Sign In' : 'Register'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-medium text-blue-600 hover:text-blue-500">
                            {isLogin ? "Don't have an account? Register here." : "Already have an account? Sign in."}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;