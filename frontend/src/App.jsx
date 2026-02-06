import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import LandRegister from './components/LandRegister';
import WeedDetector from './components/WeedDetector';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import MyAssets from './components/MyAssets';
import Login from './components/Login';
import Register from './components/Register';
import { Sprout } from 'lucide-react';

import BlockchainStatus from './components/BlockchainStatus';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const ProtectedRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" replace />;
    return children;
  };

  return (
    <Router>
      <div className="min-h-screen gradient-bg flex flex-col">
        {/* BlockchainStatus removed, integrated into Navbar */}
        <Navbar user={user} setUser={setUser} />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/signup" element={<Register setUser={setUser} />} />

            <Route path="/profile" element={
              <ProtectedRoute><Profile user={user} /></ProtectedRoute>
            } />
            <Route path="/my-assets" element={
              <ProtectedRoute><MyAssets user={user} /></ProtectedRoute>
            } />

            <Route path="/register" element={
              <ProtectedRoute><LandRegister /></ProtectedRoute>
            } />
            <Route path="/detect" element={
              <ProtectedRoute><WeedDetector /></ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
          </Routes>
        </main>

        <footer className="bg-gradient-to-r from-gray-900 to-primary-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="bg-primary-500 p-2 rounded-lg">
                    <Sprout size={24} />
                  </div>
                  <span className="text-xl font-bold">AgroTrace</span>
                </div>
                <p className="text-gray-300 text-sm">
                  Blockchain-verified agricultural traceability for sustainable farming.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Platform</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li><a href="#" className="hover:text-white">Features</a></li>
                  <li><a href="#" className="hover:text-white">API</a></li>
                  <li><a href="#" className="hover:text-white">Documentation</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Resources</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li><a href="../Weed detection research paper.pdf" className="hover:text-white">Case Studies</a></li>
                  <li><a href="#" className="hover:text-white">Support</a></li>
                  <li><a href="#" className="hover:text-white">Community</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                  <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
                  <li><a href="#" className="hover:text-white">Compliance</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
              <p>© {new Date().getFullYear()} AgroTrace. All rights reserved. Built for Sustainable Agriculture.</p>
              <p className="mt-2">Blockchain Network: Ethereum • Polygon • Solana</p>
            </div>
          </div>
        </footer>

        {/* <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              theme: {
                primary: 'green',
                secondary: 'black',
              },
            },
          }}
        /> */}
      </div>
    </Router>
  );
}

export default App;