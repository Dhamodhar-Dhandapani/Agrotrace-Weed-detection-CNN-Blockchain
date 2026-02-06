import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Sprout, ScanLine, Activity, Database, Menu, X,
  Home, User, LogIn, Wallet
} from 'lucide-react';
import { BLOCKCHAIN_CONFIG } from '../config/blockchain';

const Navbar = ({ user, setUser }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  // Wallet State
  const [walletStatus, setWalletStatus] = useState('disconnected'); // disconnected, connected, wrong_network, no_wallet
  const [walletAddress, setWalletAddress] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Check Wallet on Mount
    checkWalletConnection();
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', checkWalletConnection);
      window.ethereum.on('chainChanged', checkWalletConnection);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', checkWalletConnection);
        window.ethereum.removeListener('chainChanged', checkWalletConnection);
      }
    };
  }, []);

  const checkWalletConnection = async () => {
    if (!window.ethereum) {
      setWalletStatus('no_wallet');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });

        const targetChainIdHex = BLOCKCHAIN_CONFIG.networkId;
        const chainIdDecimal = parseInt(chainId, 16);

        if (chainId !== targetChainIdHex && chainIdDecimal !== BLOCKCHAIN_CONFIG.chainId) {
          setWalletStatus('wrong_network');
        } else {
          setWalletStatus('connected');
        }
      } else {
        setWalletStatus('disconnected');
        setWalletAddress(null);
      }
    } catch (err) {
      console.error("Wallet check failed", err);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed!");
      return;
    }
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      // Switch Network
      const { networkId, name, rpcUrls, currency } = BLOCKCHAIN_CONFIG;
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networkId }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{ chainId: networkId, chainName: name, rpcUrls, nativeCurrency: currency }],
          });
        } else {
          throw switchError;
        }
      }
      checkWalletConnection();
    } catch (error) {
      console.error("Connection failed", error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled
      ? 'bg-white/95 backdrop-blur-xl shadow-lg border-b border-gray-200'
      : 'bg-white/90 backdrop-blur-md border-b border-gray-100'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl blur opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-gradient-to-r from-primary-600 to-secondary-600 p-2.5 rounded-xl group-hover:scale-105 transition-transform">
                <Sprout size={24} className="text-white" />
              </div>
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                AgroTrace
              </span>
              <div className="text-xs text-gray-500 font-medium">Blockchain Verified</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            <NavLink to="/" icon={<Home size={18} />} text="Home" currentPath={location.pathname} />
            <NavLink to="/register" icon={<ScanLine size={18} />} text="Register Asset" currentPath={location.pathname} />
            <NavLink to="/my-assets" icon={<Sprout size={18} />} text="My Assets" currentPath={location.pathname} />
            <NavLink to="/detect" icon={<Activity size={18} />} text="Weed Detection" currentPath={location.pathname} />
            <NavLink to="/dashboard" icon={<Database size={18} />} text="Search Assets" currentPath={location.pathname} />

            <div className="h-6 w-px bg-gray-200 mx-4" />

            {/* Wallet Status Icon */}
            <button
              onClick={connectWallet}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mr-4 transition-all
                ${walletStatus === 'connected' ? 'bg-green-50 text-green-700 border border-green-200' :
                  walletStatus === 'wrong_network' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 animate-pulse' :
                    'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title={walletStatus === 'connected' ? `Connected: ${walletAddress}` : 'Connect Wallet'}
            >
              {walletStatus === 'connected' && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
              {walletStatus === 'wrong_network' && <Activity size={14} className="text-yellow-600" />}
              {walletStatus === 'disconnected' && <Wallet size={14} />}

              {walletStatus === 'connected' ? 'Connected' :
                walletStatus === 'wrong_network' ? 'Wrong Net' : 'Connect Wallet'}
            </button>

            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Link
                    to="/profile"
                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                    title="Profile"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                      <User size={16} className="text-primary-600" />
                      <span>{user.username}</span>
                    </div>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary text-sm !px-4"
                  >
                    <LogIn size={16} className="rotate-180" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="btn-secondary text-sm">
                  <LogIn size={16} />
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary text-sm">
                  <Wallet size={16} />
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-3">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="lg:hidden absolute w-full bg-white border-t border-gray-200 shadow-2xl">
          <div className="px-4 py-6 space-y-2">
            <MobileNavLink to="/" text="Home" icon={<Home size={20} />} onClick={() => setIsOpen(false)} />
            <MobileNavLink to="/register" text="Register Asset" icon={<ScanLine size={20} />} onClick={() => setIsOpen(false)} />
            <MobileNavLink to="/my-assets" text="My Assets" icon={<Sprout size={20} />} onClick={() => setIsOpen(false)} />
            <MobileNavLink to="/detect" text="Weed Detection" icon={<Activity size={20} />} onClick={() => setIsOpen(false)} />
            <MobileNavLink to="/dashboard" text="Search Assets" icon={<Database size={20} />} onClick={() => setIsOpen(false)} />

            <div className="pt-4 space-y-3 border-t border-gray-100 mt-4">
              {/* Mobile Wallet Button */}
              <button
                onClick={() => { connectWallet(); setIsOpen(false); }}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium
                ${walletStatus === 'connected' ? 'bg-green-50 text-green-700' :
                    walletStatus === 'wrong_network' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-100 text-gray-700'}`}
              >
                <Wallet size={18} />
                {walletStatus === 'connected' ? 'Wallet Connected' :
                  walletStatus === 'wrong_network' ? 'Switch Network' : 'Connect Wallet'}
              </button>

              {user ? (
                <>
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="w-full btn-secondary justify-start">
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                      <User size={20} className="text-primary-600" />
                      <span className="font-medium text-gray-900">{user.username}</span>
                      <span className="text-xs text-gray-500 ml-auto">{user.email}</span>
                    </div>
                  </Link>
                  <button onClick={handleLogout} className="w-full btn-secondary">
                    <LogIn size={18} className="rotate-180" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsOpen(false)} className="w-full btn-secondary flex justify-center">
                    <LogIn size={18} />
                    Sign In
                  </Link>
                  <Link to="/signup" onClick={() => setIsOpen(false)} className="w-full btn-primary flex justify-center">
                    <Wallet size={18} />
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const NavLink = ({ to, icon, text, currentPath }) => {
  const isActive = currentPath === to;

  return (
    <Link
      to={to}
      className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${isActive
        ? 'bg-gradient-to-r from-primary-50 to-secondary-50 text-primary-700 border border-primary-100'
        : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
        }`}
    >
      {icon}
      <span>{text}</span>
    </Link>
  );
};

const MobileNavLink = ({ to, text, icon, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive
        ? 'bg-primary-50 text-primary-700'
        : 'text-gray-600 hover:bg-gray-50'
        }`}
    >
      <div className={`p-2 rounded-lg ${isActive ? 'bg-primary-100' : 'bg-gray-100'}`}>
        {icon}
      </div>
      <span className="font-medium">{text}</span>
    </Link>
  );
};

export default Navbar;