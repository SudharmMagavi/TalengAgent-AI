// client/src/pages/Login.jsx
import { useState } from 'react';
import useStore from '../store/useStore';
import { useNavigate } from 'react-router-dom';
// IMPORT YOUR DYNAMIC API INSTEAD OF RAW AXIOS
import { loginOrganization, registerOrganization } from '../services/api';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true); // Toggle state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Combined form state for both Login and Register
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        email: '',
        password: ''
    });

    const login = useStore((state) => state.login);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            // Dynamically call Login OR Register based on the state
            const { data } = isLogin 
                ? await loginOrganization({ email: formData.email, password: formData.password }) 
                : await registerOrganization(formData);
            
            const { token, ...userData } = data;
            
            login(userData, token); 
            navigate('/dashboard');
        } catch (err) {
            console.error("Auth Error:", err);
            setError(err.response?.data?.message || `${isLogin ? 'Login' : 'Registration'} failed. Please check your details.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex bg-slate-950 font-sans selection:bg-blue-500/30">
            {/* LEFT PANEL */}
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden border-r border-slate-800 p-12 flex-col justify-between">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                        </div>
                        <span className="text-white text-xl font-bold tracking-tight">TalentAgent AI</span>
                    </div>
                </div>

                <div className="relative z-10 max-w-md">
                    <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
                        Evaluate top engineering talent with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">precision.</span>
                    </h1>
                </div>

                <div className="relative z-10 text-slate-500 text-sm font-medium">
                    © 2026 AI Evaluation System. Enterprise Edition.
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 overflow-y-auto">
                <div className="max-w-md w-full space-y-8">
                    <div className="text-center lg:text-left mt-10">
                        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                            {isLogin ? 'Welcome back' : 'Create an account'}
                        </h2>
                        <p className="text-slate-400">
                            {isLogin ? 'Sign in to your organization dashboard.' : 'Register your organization to get started.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 mt-8">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            {/* EXTRA FIELDS FOR REGISTRATION */}
                            {!isLogin && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                                        <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Company Name</label>
                                        <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="Acme Corp" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600" required />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Work Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="name@company.com" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600" required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••••••" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600" required />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70">
                            {loading ? 'Authenticating...' : (isLogin ? 'Sign In to Dashboard' : 'Register Organization')}
                        </button>
                    </form>

                    {/* TOGGLE BUTTON */}
                    <div className="text-center mt-6">
                        <button 
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError('');
                            }} 
                            className="text-sm font-medium text-blue-500 hover:text-blue-400 transition-colors"
                        >
                            {isLogin ? "Don't have an account? Register here." : "Already have an account? Sign in."}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;