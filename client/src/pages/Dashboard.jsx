// client/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { createAssessment, getDashboardData } from '../services/api';
import useStore from '../store/useStore';
import AssessmentScorecard from '../pages/AssessmentScorecard';

const Dashboard = () => {
    const user = useStore((state) => state.user);
    
    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    
    // Form State
    const [formData, setFormData] = useState({ candidateName: '', candidateEmail: '', jobRole: '' });
    const [file, setFile] = useState(null);
    
    // Data State
    const [candidates, setCandidates] = useState([]);
    const [selectedAssessment, setSelectedAssessment] = useState(null);

    // Fetch past candidates when the dashboard loads
    useEffect(() => {
        fetchCandidates();
    }, []);

    const fetchCandidates = async () => {
        try {
            const { data } = await getDashboardData();
            setCandidates(data || []);
        } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
            if (candidates.length === 0) {
                setCandidates([]); // Keep empty if it fails
            }
        }
    };

    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleFileChange = (e) => setFile(e.target.files[0]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setGeneratedLink('');
        
        if (!file) return setError('Please upload a PDF resume.');
        
        setLoading(true);
        
        const data = new FormData();
        data.append('candidateName', formData.candidateName);
        data.append('candidateEmail', formData.candidateEmail);
        data.append('jobRole', formData.jobRole);
        data.append('resume', file);

        try {
            // Your api.js handles passing the user?.token under the hood!
            const response = await createAssessment(data);
            setGeneratedLink(`http://localhost:5173${response.data.candidateLink}`); 
            setFormData({ candidateName: '', candidateEmail: '', jobRole: '' });
            setFile(null);
            fetchCandidates(); // Refresh the table
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate assessment.');
        } finally {
            setLoading(false);
        }
    };

    // Calculate quick stats
    const total = candidates.length;
    const completed = candidates.filter(c => c.status === 'Completed').length;
    const pending = total - completed;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-sans selection:bg-blue-500/30">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Welcome, {user?.companyName || 'Organization'}</h1>
                        <p className="text-slate-400 mt-1">Manage technical assessments and track candidate performance.</p>
                    </div>
                    <button 
                        onClick={() => { setIsModalOpen(true); setGeneratedLink(''); setError(''); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-5 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 transform hover:-translate-y-0.5"
                    >
                        <span className="text-xl leading-none">+</span> New Assessment
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm flex flex-col justify-center">
                        <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider text-xs">Total Candidates</div>
                        <div className="text-4xl font-black text-white">{total}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider text-xs">Pending Tests</div>
                        <div className="text-4xl font-black text-amber-400">{pending}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm flex flex-col justify-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div className="text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider text-xs">Completed</div>
                        <div className="text-4xl font-black text-emerald-400">{completed}</div>
                    </div>
                </div>

                {/* Main Data Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-950/50 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800">
                                <tr>
                                    <th className="px-6 py-5 font-medium">Candidate Info</th>
                                    <th className="px-6 py-5 font-medium">Role</th>
                                    <th className="px-6 py-5 font-medium">Status</th>
                                    <th className="px-6 py-5 font-medium">AI Score</th>
                                    <th className="px-6 py-5 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {candidates.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                            No candidates generated yet. Click "New Assessment" to begin.
                                        </td>
                                    </tr>
                                ) : (
                                    candidates.map((cand) => (
                                        <tr key={cand._id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white text-base">{cand.candidateName}</div>
                                                <div className="text-slate-500 text-xs mt-0.5">{cand.candidateEmail || 'No email provided'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300 font-medium">
                                                {cand.jobRole}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                                                    cand.status === 'Completed' 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                                                }`}>
                                                    {cand.status === 'Completed' ? '✓ Completed' : '⏱ Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {cand.status === 'Completed' ? (
                                                    <span className="font-bold text-lg text-white">
                                                        {cand.scorecard?.overallScore || '--'} <span className="text-slate-500 text-sm font-normal">/100</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600 font-mono">-- /100</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {cand.status === 'Completed' ? (
                                                    <button 
                                                        onClick={() => setSelectedAssessment(cand)} 
                                                        className="bg-blue-600/10 text-blue-400 hover:text-white hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-semibold transition border border-blue-600/20 hover:border-blue-500"
                                                    >
                                                        View Report
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => navigator.clipboard.writeText(`http://localhost:5173/take-test/${cand.uniqueToken}`)}
                                                        className="text-slate-300 hover:text-white font-medium text-sm px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500 hover:bg-slate-800 transition flex items-center gap-2 ml-auto"
                                                    >
                                                        Copy Link
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create Assessment Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
                        
                        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                            <h3 className="text-xl font-bold text-white tracking-tight">Generate Assessment</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center transition">✕</button>
                        </div>
                        
                        <div className="p-6">
                            {generatedLink ? (
                                <div className="space-y-4">
                                    <div className="flex justify-center mb-2">
                                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                    </div>
                                    <h4 className="text-center text-white font-bold text-lg">Test Generated Successfully</h4>
                                    <p className="text-center text-slate-400 text-sm mb-4">Send this secure link to your candidate.</p>
                                    
                                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg flex items-center justify-between gap-2">
                                        <input type="text" readOnly value={generatedLink} className="bg-transparent text-slate-300 text-sm w-full outline-none" />
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(generatedLink)} 
                                            className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-bold transition whitespace-nowrap"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setIsModalOpen(false)}
                                        className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition"
                                    >
                                        Done
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{error}</div>}
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Candidate Name</label>
                                        <input type="text" name="candidateName" required value={formData.candidateName} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition placeholder:text-slate-600" placeholder="Jane Doe" />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                                        <input type="email" name="candidateEmail" required value={formData.candidateEmail} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition placeholder:text-slate-600" placeholder="jane@example.com" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Job Role</label>
                                        <input type="text" name="jobRole" required value={formData.jobRole} onChange={handleInputChange} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition placeholder:text-slate-600" placeholder="e.g. Senior Frontend Engineer" />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resume Context (PDF)</label>
                                        <input type="file" accept="application/pdf" required onChange={handleFileChange} className="w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-600/10 file:text-blue-400 hover:file:bg-blue-600/20 transition cursor-pointer" />
                                    </div>

                                    <div className="pt-2">
                                        <button 
                                            type="submit" 
                                            disabled={loading} 
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? 'AI is Analyzing Resume...' : 'Generate AI Assessment'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* The Slide-Out Scorecard Component */}
            {selectedAssessment && (
                <AssessmentScorecard 
                    assessment={selectedAssessment} 
                    onClose={() => setSelectedAssessment(null)} 
                />
            )}
        </div>
    );
};

export default Dashboard;