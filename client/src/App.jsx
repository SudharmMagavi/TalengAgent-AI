// client/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useStore from './store/useStore';

import Login from './pages/Login'; 
import Dashboard from './pages/Dashboard';
import InterviewRoom from './pages/InterviewRoom'; 

// 1. Create an inner component to handle the routing logic and hooks
const AppContent = () => {
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const location = useLocation();

  // 2. Define when to hide the Navbar (hide on root '/' and '/auth')
  const hideNavbar = location.pathname === '/auth' || location.pathname === '/';

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100">
      
      {/* Conditionally render the simple Navbar */}
      {!hideNavbar && (
        <nav className="bg-slate-950 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
          
          {/* BRANDING STRIP WITH LOGO */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-wide text-white">TalentAgent AI</h1>
          </div>

          {/* ACTIONS */}
          {user && (
            <button
              onClick={logout}
              className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition-colors"
            >
              Logout Dashboard
            </button>
          )}
        </nav>
      )}

      {/* Page Routes */}
      <Routes>
        {/* Default Route */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />} />
        
        {/* Auth Route */}
        <Route path="/auth" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        
        {/* HR Dashboard (Protected by Zustand) */}
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
        
        {/* CANDIDATE ROUTE: This is public! Anyone with the unique token link can access it. */}
        <Route path="/take-test/:token" element={<InterviewRoom />} />
      </Routes>
    </div>
  );
};

// 3. Wrap everything in the Router here
function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;