import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  Clock, Archive, Sprout, Droplets, Calendar, MapPin,
  ShieldCheck, AlertTriangle, Search, Activity,
  Download, Filter, ChevronRight, CheckCircle,
  BarChart3, ExternalLink, Hash,
  Copy, Link, Eye, X
} from 'lucide-react';
import { storeDetectionOnBlockchain, getDetectionDetails } from '../utils/blockchain';
import { getHistory, getLand, verifyExternalTransaction } from '../services/api';

const Dashboard = () => {
  const location = useLocation(); // Add hook
  // const [landId, setLandId] = useState('');
  // Check if we have preloaded state
  const [landId, setLandId] = useState(location.state?.preloadedLandId || '');

  const [history, setHistory] = useState([]);
  const [landDetails, setLandDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Blockchain Viewer State
  const [showChainModal, setShowChainModal] = useState(false);
  const [chainData, setChainData] = useState(null);
  const [chainLoading, setChainLoading] = useState(false);

  const fetchData = async (e) => {
    if (e) e.preventDefault();
    if (!landId) return;

    setLoading(true);
    setError('');
    setLandDetails(null);
    setHistory([]);

    try {
      const [landRes, histRes] = await Promise.all([
        getLand(landId),
        getHistory(landId)
      ]);
      setLandDetails(landRes.data);
      setHistory(histRes.data);
    } catch {
      setError("Asset ID not found. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (record) => {
    try {
      // Create a unique IPFS hash placeholder or use real data if available
      // For now using a mock hash based on ID and time for demonstration
      const mockIpfsHash = `Qm${record.id}x${Date.now()}`;

      const txHash = await storeDetectionOnBlockchain(
        mockIpfsHash,
        "General Weed", // You might want to pass specific type if available
        record.confidence * 100
      );

      // Persist to Backend
      await verifyExternalTransaction(record.id, txHash);

      // Optimistically update UI
      setHistory(prev => prev.map(item =>
        item.id === record.id
          ? { ...item, is_on_chain: true, tx_hash: txHash }
          : item
      ));

      alert(`Verification successful! TX: ${txHash}`);
    } catch (err) {
      alert("Verification failed: " + err.message);
    }
  };

  const handleViewChainData = async (txHash) => {
    setShowChainModal(true);
    setChainLoading(true);
    setChainData(null);
    try {
      const data = await getDetectionDetails(txHash);
      setChainData(data);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to load chain data");
      setShowChainModal(false);
    } finally {
      setChainLoading(false);
    }
  };

  const filteredHistory = history.filter(record => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'verified') return record.is_on_chain;
    if (activeFilter === 'pending') return !record.is_on_chain;
    return true;
  });

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Asset Traceability
          </h1>
          <p className="text-gray-600">
            Track and verify agricultural assets from seed to harvest
          </p>
        </div>

        {/* Search Section */}
        <div className="glass-card rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Activity className="text-primary-600" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Search Asset
            </h2>
          </div>

          <form onSubmit={fetchData} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
              <input
                value={landId}
                onChange={(e) => setLandId(e.target.value)}
                className="input-field pl-12"
                placeholder="Enter Asset ID or scan QR code..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !landId}
                className="btn-primary flex-1"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Search Asset
                  </>
                )}
              </button>

            </div>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-red-500 mt-0.5" size={20} />
              <div>
                <p className="font-medium text-red-800">{error}</p>
                <p className="text-sm text-red-600 mt-1">
                  Ensure the ID is correct and the asset is registered on the network.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Asset Details */}
        {landDetails && (
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            {/* Main Details */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Sprout className="text-primary-600" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {landDetails.farmer_name}
                    </h2>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin size={16} className="mr-2" />
                    {landDetails.location}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-green-700">
                    Active
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={<Sprout className="text-green-500" />}
                  label="Crop Variety"
                  value={landDetails.crop_type}
                />
                <StatCard
                  icon={<Hash className="text-blue-500" />}
                  label="Batch ID"
                  value={landDetails.crop_id || "N/A"}
                />
                <StatCard
                  icon={<Droplets className="text-cyan-500" />}
                  label="Water Source"
                  value={landDetails.water_source || "N/A"}
                />
                <StatCard
                  icon={<Calendar className="text-purple-500" />}
                  label="Planted On"
                  value={new Date(landDetails.planting_date).toLocaleDateString() || "N/A"}
                />
              </div>

              {/* Additional Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoItem label="Farming Method" value={landDetails.farming_method || "Conventional"} />
                  {landDetails.farming_method === 'Organic' && (
                    <InfoItem label="Organic Certificate" value={landDetails.organic_certificate_number || "Pending"} />
                  )}
                  <InfoItem label="Soil Type" value={landDetails.soil_type || "Not specified"} />
                  <InfoItem label="Area Size" value={`${landDetails.area_size || '0'} acres`} />
                </div>
              </div>
            </div>

            {/* QR & Blockchain Info */}
            <div className="glass-card rounded-2xl p-6">
              <div className="text-center mb-4">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Digital Anchor
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Scan to verify on blockchain
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl mb-4 flex justify-center">
                <img
                  src={`http://localhost:5000/api/land/qr/${landDetails.id}`}
                  alt="QR Code"
                  className="w-40 h-40"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Blockchain Status</span>
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle size={14} />
                    Verified
                  </span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-500 bg-gray-100 p-2 rounded truncate">
                    <span className="mr-2">{landDetails.id}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(landDetails.id)}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>


              </div>
            </div>
          </div>
        )}

        {/* Timeline Section */}
        {history.length > 0 && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Clock className="text-primary-600" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Event Timeline
                  </h3>
                  <p className="text-sm text-gray-600">
                    Detection events and blockchain confirmations
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                {['all', 'verified', 'pending'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeFilter === filter
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-200 to-transparent" />

              <div className="space-y-8 ml-14">
                {filteredHistory.map((record, index) => (
                  <TimelineItem
                    key={record.id}
                    record={record}
                    index={index}
                    onVerify={() => handleVerify(record)}
                    onViewChain={() => handleViewChainData(record.tx_hash)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Blockchain Data Modal */}
        {showChainModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="text-green-600" />
                    On-Chain Data
                  </h3>
                  <p className="text-sm text-gray-500">
                    Data directly fetched from Ethereum Smart Contract
                  </p>
                </div>
                <button
                  onClick={() => setShowChainModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {chainLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mb-3" />
                  <p>Fetching from Blockchain...</p>
                </div>
              ) : chainData ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl space-y-3 font-mono text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs uppercase tracking-wider">Blockchain ID</span>
                      <span className="font-semibold text-gray-900">#{chainData.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs uppercase tracking-wider">Timestamp</span>
                      <span className="text-gray-900">{chainData.timestamp}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs uppercase tracking-wider">Uploader</span>
                      <span className="break-all text-xs text-blue-600">{chainData.uploader}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-gray-500 block text-xs uppercase tracking-wider">Weed Type</span>
                        <span className="text-gray-900">{chainData.weedType}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs uppercase tracking-wider">Confidence</span>
                        <span className="text-green-600 font-bold">{chainData.confidence}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 border border-green-100 bg-green-50 rounded-lg flex items-start gap-3">
                    <CheckCircle className="text-green-500 mt-0.5" size={16} />
                    <div className="text-xs text-green-800">
                      <p className="font-semibold">Cryptographically Verified</p>
                      <p>This data is immutable and stored permanently on the Ethereum network.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-red-500 text-center py-8">
                  Failed to load data. Please check connection.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!landDetails && !loading && history.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center">
              <Search className="text-primary-600" size={40} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Search for an Asset
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Enter an Asset ID above to view its complete traceability history,
              detection events, and blockchain verification status.
            </p>
            <div className="inline-flex items-center gap-2 text-primary-600 font-medium">
              <ChevronRight size={16} />
              <span>Start by searching for an asset ID</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="stat-card">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 bg-gray-100 rounded-lg">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </p>
        <p className="text-lg font-bold text-gray-900 mt-1">
          {value}
        </p>
      </div>
    </div>
  </div>
);

const InfoItem = ({ label, value }) => (
  <div>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="font-medium text-gray-900">{value}</p>
  </div>
);

const TimelineItem = ({ record, index, onVerify, onViewChain }) => (
  <div className="relative">
    {/* Timeline dot */}
    <div className={`absolute -left-20 top-2 w-3 h-3 rounded-full border-4 border-white 
      ${record.is_on_chain ? 'bg-green-500 shadow-green-200' : 'bg-warning-500 shadow-yellow-200'} 
      shadow-lg`}
    />

    <div className="card-hover bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="font-semibold text-gray-900">
            Weed Detection #{index + 1}
          </h4>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(record.timestamp).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short'
            })}
          </p>

          {record.removal_method && (
            <div className="mt-2 text-xs flex flex-wrap gap-2">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200">
                <span className="font-semibold">Method:</span> {record.removal_method}
              </span>
              {record.herbicide_name && (
                <span className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-100">
                  <span className="font-semibold">Agent:</span> {record.herbicide_name}
                </span>
              )}
            </div>
          )}
        </div>

        {record.is_on_chain ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 
              rounded-full text-sm font-medium">
              <ShieldCheck size={14} />
              Verified on Chain
            </span>
            <button
              onClick={onViewChain}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View On-Chain Data"
            >
              <Eye size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-50 text-yellow-700 
              rounded-full text-sm font-medium">
              <AlertTriangle size={14} />
              Pending Verification
            </span>
            <button
              onClick={onVerify}
              className="flex items-center gap-1 px-3 py-1 bg-primary-600 text-white rounded-full text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              <Link size={14} />
              Verify Now
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Weeds Detected
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {record.weed_count}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Confidence
          </p>
          <p className="text-2xl font-bold text-primary-600 mt-1">
            {(record.confidence * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Transaction Hash */}
      {record.tx_hash && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Transaction Hash</span>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-xs text-gray-600 bg-gray-50 p-2 rounded">
            <span className="truncate">{record.tx_hash}</span>
            <button
              onClick={() => navigator.clipboard.writeText(record.tx_hash)}
              className="text-primary-600 hover:text-primary-700 font-medium ml-2"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default Dashboard;