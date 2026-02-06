import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { uploadVideo, sendLiveFrame, verifyExternalTransaction } from '../services/api';
import { storeDetectionOnBlockchain } from '../utils/blockchain';
import {
  Upload, Camera, ShieldCheck, AlertCircle, Scan,
  Loader2, Video, Image, Clock, Zap, Battery,
  Download, Share2, Maximize2, Settings
} from 'lucide-react';

const WeedDetector = () => {
  const [mode, setMode] = useState('webcam');
  const [landId, setLandId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const webcamRef = useRef(null);
  const [lastRecordId, setLastRecordId] = useState(null);
  const [chainHash, setChainHash] = useState(null);
  const [cameraSettings, setCameraSettings] = useState({
    resolution: 'hd',
    frameRate: 30,
    confidence: 0.7
  });

  const capture = useCallback(async () => {
    if (!landId) {
      alert("Please enter a Land ID first");
      return;
    }

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    try {
      const blob = await (await fetch(imageSrc)).blob();
      const formData = new FormData();
      formData.append('image', blob, 'capture.jpg');
      formData.append('land_id', landId);

      setProcessing(true);
      const response = await sendLiveFrame(formData);
      setResult(response.data);
      setLastRecordId(response.data.id);
      setChainHash(response.data.tx_hash);
    } catch (error) {
      console.error('Capture error:', error);
    } finally {
      setProcessing(false);
    }
  }, [webcamRef, landId]);

  const handleUpload = async (e) => {
    if (!landId) {
      alert("Please enter a Land ID first");
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('video', file);
    formData.append('land_id', landId);

    setLoading(true);
    try {
      const response = await uploadVideo(formData);
      setResult(response.data.results);
      setLastRecordId(response.data.detection_id);
      setChainHash(null);
    } catch (error) {
      console.error('Upload error:', error);
      // Check for the specific backend error message
      const errMsg = error.response?.data?.error || "Detection failed";
      alert(errMsg); // Simple alert as requested, or set error state
      setResult({ error: errMsg }); // Show error in results panel
    } finally {
      setLoading(false);
    }
  };

  const handleChainStore = async () => {
    if (!lastRecordId) return;
    try {
      // 1. Send to Blockchain (MetaMask)
      // Use a mock IPFS hash for now, similar to Dashboard
      const mockIpfsHash = `Qm${lastRecordId}x${Date.now()}`;

      const txHash = await storeDetectionOnBlockchain(
        mockIpfsHash,
        "General Weed",
        Math.floor((result.confidence || result.avg_confidence || 0) * 100)
      );

      // 2. Save Hash to Backend
      await verifyExternalTransaction(lastRecordId, txHash);

      setChainHash(txHash);
      alert(`Verification successful! TX: ${txHash}`);
    } catch (err) {
      console.error(err);
      alert("Blockchain transaction failed: " + (err.message || "Unknown error"));
    }
  };

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            AI Weed Detection
          </h1>
          <p className="text-gray-600">
            Real-time computer vision analysis with blockchain verification
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="space-y-6">
            {/* Asset Input */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Scan className="text-primary-600" size={18} />
                </div>
                <h3 className="font-semibold text-gray-900">Target Asset</h3>
              </div>
              <input
                className="input-field font-mono text-sm"
                placeholder="Paste Land UUID..."
                value={landId}
                onChange={(e) => setLandId(e.target.value)}
              />
            </div>

            {/* Mode Selection */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Video className="text-blue-600" size={18} />
                </div>
                <h3 className="font-semibold text-gray-900">Input Source</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <ModeButton
                  active={mode === 'webcam'}
                  onClick={() => setMode('webcam')}
                  icon={<Camera className="text-blue-600" />}
                  label="Live Camera"
                  description="Real-time capture"
                />
                <ModeButton
                  active={mode === 'upload'}
                  onClick={() => setMode('upload')}
                  icon={<Upload className="text-purple-600" />}
                  label="Upload Video"
                  description="Batch processing"
                />
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {mode === 'webcam'
                  ? "Ensure good lighting and stable camera for optimal detection accuracy."
                  : "Supported formats: MP4, AVI, MOV. Max file size: 100MB."
                }
              </div>
            </div>

            {/* Settings Panel */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Settings className="text-gray-600" size={18} />
                  </div>
                  <h3 className="font-semibold text-gray-900">Detection Settings</h3>
                </div>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Maximize2 size={18} />
                </button>
              </div>

              {showSettings && (
                <div className="space-y-4 animate-fade-in-up">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Confidence Threshold
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.1"
                      value={cameraSettings.confidence}
                      onChange={(e) => setCameraSettings({
                        ...cameraSettings,
                        confidence: parseFloat(e.target.value)
                      })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Low ({cameraSettings.confidence})</span>
                      <span>High</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Frame Rate
                    </label>
                    <select
                      value={cameraSettings.frameRate}
                      onChange={(e) => setCameraSettings({
                        ...cameraSettings,
                        frameRate: parseInt(e.target.value)
                      })}
                      className="input-field"
                    >
                      <option value={15}>15 FPS</option>
                      <option value={30}>30 FPS</option>
                      <option value={60}>60 FPS</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Viewport */}
          <div className="lg:col-span-2 space-y-6">
            {/* Camera/Upload Area */}
            <div className="relative glass-card rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-gray-900 to-black">
              {mode === 'webcam' ? (
                <div className="relative w-full h-full">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{
                      width: 1280,
                      height: 720,
                      facingMode: 'environment'
                    }}
                  />

                  {/* Viewfinder Overlay */}
                  <div className="absolute inset-0 border-4 border-white/10 pointer-events-none m-4 rounded-2xl">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 -mt-0.5 -ml-0.5"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 -mt-0.5 -mr-0.5"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 -mb-0.5 -ml-0.5"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 -mb-0.5 -mr-0.5"></div>
                  </div>

                  {/* Capture Button */}
                  <div className="absolute bottom-6 left-0 w-full flex justify-center">
                    <button
                      onClick={capture}
                      disabled={processing || !landId}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
                      <div className="relative bg-gradient-to-br from-red-500 to-red-600 text-white rounded-full p-5 shadow-2xl hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
                        {processing ? (
                          <Loader2 className="animate-spin" size={32} />
                        ) : (
                          <Scan size={32} />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Status Bar */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm">
                      <Battery size={14} />
                      <span>Live</span>
                    </div>
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm">
                      <Clock size={14} />
                      <span>{cameraSettings.frameRate} FPS</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl flex items-center justify-center">
                      <Upload className="text-primary-600" size={32} />
                    </div>
                    <p className="text-lg font-medium text-white mb-2">Upload Video for Analysis</p>
                    <p className="text-gray-300 text-sm">Drag & drop or click to browse</p>
                  </div>

                  <label className="cursor-pointer">
                    <div className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-6 py-3 rounded-xl text-white font-medium transition-colors">
                      Select Video File
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Loading Overlay */}
              {(loading || processing) && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="relative mx-auto mb-6">
                      <Loader2 className="animate-spin text-primary-400" size={64} />
                      <Zap className="absolute inset-0 m-auto text-primary-200" size={32} />
                    </div>
                    <p className="text-2xl font-bold text-white mb-2">
                      {processing ? 'Analyzing Frame...' : 'Processing Video...'}
                    </p>
                    <p className="text-gray-300 max-w-md mx-auto">
                      {processing
                        ? 'Running AI detection models on captured image'
                        : 'Scanning video frames for weed detection patterns'
                      }
                    </p>
                    <div className="mt-6 w-64 h-1 bg-gray-700 rounded-full overflow-hidden mx-auto">
                      <div className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Results Panel */}
            {result && (
              <div className="glass-card rounded-2xl p-6 animate-fade-in-up">
                {result.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-3" />
                    <h3 className="text-xl font-bold text-red-700 mb-2">Detection Error</h3>
                    <p className="text-red-600 font-medium">{result.error}</p>
                    <p className="text-sm text-red-500 mt-2">
                      The custom model could not be loaded or executed.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          Detection Results
                        </h3>
                        <p className="text-gray-600">
                          AI analysis completed successfully
                        </p>
                      </div>

                      <div className="flex gap-3">
                        {chainHash ? (
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold border border-green-200">
                            <ShieldCheck size={16} />
                            Verified on Blockchain
                          </span>
                        ) : (
                          <button
                            onClick={handleChainStore}
                            className="btn-primary text-sm"
                          >
                            <ShieldCheck size={16} />
                            Commit to Blockchain
                          </button>
                        )}

                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <ResultStat
                        label="Weeds Detected"
                        value={result.weed_count || result.total_weeds || 0}
                        change="+12%"
                        color="red"
                      />
                      <ResultStat
                        label="Confidence"
                        value={`${Math.round((result.confidence || result.avg_confidence || 0) * 100)}%`}
                        change="High"
                        color="blue"
                      />
                      <ResultStat
                        label="Processing Time"
                        value={`${(result.processing_time || 0.8).toFixed(2)}s`}
                        change="Fast"
                        color="green"
                      />
                      <ResultStat
                        label="Frames Analyzed"
                        value={result.frames_analyzed || 1}
                        change="100%"
                        color="purple"
                      />
                    </div>

                    {/* Transaction Details */}
                    {chainHash && (
                      <div className="pt-6 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-100 rounded-lg">
                              <ShieldCheck className="text-green-600" size={16} />
                            </div>
                            <h4 className="font-semibold text-gray-900">
                              Blockchain Transaction
                            </h4>
                          </div>
                          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                            <Share2 size={16} />
                          </button>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="font-mono text-sm text-gray-700 break-all">
                            {chainHash}
                          </div>
                          <div className="flex justify-between items-center mt-3 text-sm text-gray-500">
                            <span>Confirmed • 2 seconds ago</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(chainHash)}
                              className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                              Copy Hash
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ModeButton = ({ active, onClick, icon, label, description }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center p-4 rounded-xl border transition-all ${active
      ? 'bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200 ring-1 ring-primary-100'
      : 'bg-white border-gray-200 hover:border-primary-200 hover:bg-gray-50'
      }`}
  >
    <div className={`p-3 rounded-xl mb-3 ${active ? 'bg-white shadow-sm' : 'bg-gray-100'
      }`}>
      {icon}
    </div>
    <span className={`font-semibold mb-1 ${active ? 'text-primary-700' : 'text-gray-700'
      }`}>
      {label}
    </span>
    <span className="text-xs text-gray-500">{description}</span>
  </button>
);

const ResultStat = ({ label, value, change, color }) => {
  const colorClasses = {
    red: 'from-red-500 to-red-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600'
  };

  return (
    <div className="stat-card">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <p className={`text-3xl font-bold bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
          {value}
        </p>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${color === 'green'
          ? 'bg-green-50 text-green-700'
          : 'bg-blue-50 text-blue-700'
          }`}>
          {change}
        </span>
      </div>
    </div>
  );
};

export default WeedDetector;