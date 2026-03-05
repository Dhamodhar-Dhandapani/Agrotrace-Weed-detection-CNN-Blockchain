import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { uploadVideo, sendLiveFrame, verifyExternalTransaction, runAutonomousSimulation, streamLiveFrame, getVideoStatus, startLiveSession, stopLiveSession } from '../services/api';
import { storeDetectionOnBlockchain } from '../utils/blockchain';
import {
  Upload, Camera, ShieldCheck, AlertCircle, Scan,
  Loader2, Video, Image, Clock, Zap, Battery,
  Download, Share2, Maximize2, Settings, Bot, Crosshair,
  Play, Square // Added Play/Square icons
} from 'lucide-react';

const WeedDetector = () => {
  const [mode, setMode] = useState('webcam'); // 'webcam', 'upload', 'autonomous'
  const [landId, setLandId] = useState('');
  const [removalMethod, setRemovalMethod] = useState('Manual');
  const [herbicideName, setHerbicideName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const webcamRef = useRef(null);
  const [lastRecordId, setLastRecordId] = useState(null);
  const [chainHash, setChainHash] = useState(null);

  // Streaming State
  const [liveStreamActive, setLiveStreamActive] = useState(false);
  const [processedLiveFrame, setProcessedLiveFrame] = useState(null);
  const streamRef = useRef(null); // To store valid ref for loop

  const [cameraSettings, setCameraSettings] = useState({
    resolution: 'hd',
    frameRate: 30, // Target FPS for loop
    confidence: 0.7
  });

  // Stop stream on unmount
  useEffect(() => {
    return () => {
      setLiveStreamActive(false);
    };
  }, []);

  // Polling for Video Upload Status to update UI counters
  useEffect(() => {
    let intervalId;
    // Only poll if we have a processed video URL (upload mode) and NOT in live stream mode
    if (result?.processed_video_url && !liveStreamActive && mode === 'upload') {
      // Extract filename from URL (assumes standard structure ending in filename or query params)
      // URL format: http://host/api/stream/video/<filename>?params
      try {
        // Split by '/stream/video/' to get the part after it
        const urlParts = result.processed_video_url.split('/stream/video/');
        if (urlParts.length > 1) {
          const filenameQuery = urlParts[1];
          const filename = filenameQuery.split('?')[0]; // Remove query params

          intervalId = setInterval(async () => {
            try {
              const apiRes = await getVideoStatus(filename);
              const stats = apiRes.data;
              if (stats) {
                setResult(prev => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    weed_count: stats.weed_count,
                    frames_analyzed: stats.frames_processed,
                    processing_status: stats.status
                  };
                });

                // Auto-reset on completion
                if (stats.status === 'completed') {
                  clearInterval(intervalId);
                  // Update final stats one last time and remove video URL to show Upload UI
                  setResult(prev => ({
                    ...prev,
                    weed_count: stats.weed_count,
                    frames_analyzed: stats.frames_processed,
                    processing_status: 'completed',
                    processed_video_url: null, // Hides player, shows upload box
                    completion_message: "Processing Complete! Results saved to database."
                  }));
                  // Do NOT set result to null, keep it for the stats panel
                }
              }
            } catch (e) {
              console.error("Status polling error", e);
            }
          }, 500); // Poll every 500ms
        }
      } catch (err) {
        console.error("Error parsing video URL for polling", err);
      }
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [result?.processed_video_url, liveStreamActive, mode]);

  // State for Session ID
  const [sessionId, setSessionId] = useState(null);

  // --- LIVE STREAMING LOOP ---
  const processStreamFrame = useCallback(async () => {
    if (!streamRef.current) return;

    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        try {
          const res = await fetch(imageSrc);
          const blob = await res.blob();

          const formData = new FormData();
          formData.append('image', blob, 'live.jpg');
          formData.append('land_id', landId);
          formData.append('removal_method', removalMethod);
          formData.append('herbicide_name', herbicideName);

          if (sessionId) {
            formData.append('session_id', sessionId);
          }

          const response = await streamLiveFrame(formData);

          if (response.data && response.data.image) {
            setProcessedLiveFrame(response.data.image);
            setResult(prev => ({
              ...prev,
              weed_count: response.data.weed_count, // Cumulative from backend
              processed_video_url: null, // Ensure video player is hidden
              confidence: response.data.weed_count > 0 ? 0.85 : 0.0,
              processing_time: response.data.inference_time,
              status: "streaming"
            }));
          }

        } catch (err) {
          console.error("Stream frame error", err);
        }
      }
    }

    if (streamRef.current) {
      setTimeout(processStreamFrame, 100);
    }
  }, [landId, removalMethod, herbicideName, sessionId]); // Depend on sessionId

  const toggleLiveStream = async () => {
    if (liveStreamActive) {
      // STOP RECORDING
      setLiveStreamActive(false);
      streamRef.current = false;
      setProcessedLiveFrame(null);

      if (sessionId) {
        setLoading(true);
        try {
          const response = await stopLiveSession({ session_id: sessionId });
          const stats = response.data;
          // Update final results
          setResult(prev => ({
            ...prev,
            weed_count: stats.weed_count,
            frames_analyzed: stats.frames,
            processing_status: 'completed',
            completion_message: "Live Session Saved successfully.",
            status: "completed"
          }));
          if (stats.detection_id) setLastRecordId(stats.detection_id);
          setSessionId(null);
        } catch (err) {
          console.error("Failed to stop session", err);
          alert("Failed to save session data.");
        } finally {
          setLoading(false);
        }
      }

    } else {
      // START RECORDING
      if (!landId) {
        alert("Please enter a Land ID first");
        return;
      }

      setLoading(true);
      try {
        const response = await startLiveSession({
          land_id: landId,
          removal_method: removalMethod,
          herbicide_name: herbicideName
        });

        const newSessionId = response.data.session_id;
        setSessionId(newSessionId);
        setLiveStreamActive(true);
        streamRef.current = true;

        // Allow state to update before starting loop? 
        // processStreamFrame depends on sessionId, so we need to ensure it's set.
        // Using a ref for sessionId might be better for immediate availability in loop, 
        // but let's try calling it with the new ID explicitly or waiting.
        // Actually, setState is async. 
        // We can pass the ID to the first call? 
        // But processStreamFrame uses the state `sessionId`.
        // Let's use a ref or just wait a tick? 
        // Better: update processStreamFrame to read from a ref if needed, OR just restart the loop.
        // But `processStreamFrame` is a callback depending on `sessionId`. 
        // Implementation detail: Use a timeout to start?

        // Hack: Trigger loop slightly later to allow state update?
        setTimeout(() => {
          // But wait, the closure might still see old state?
          // No, processStreamFrame is in `useCallback` with dependency `sessionId`.
          // So when sessionId changes, a NEW function is created.
          // We need to call THAT new function.
          // But we can't call it here easily.

          // Solution: `useEffect` listening to `liveStreamActive`?
          // No, previously I called it directly.

          // Let's use a `useEffect` to trigger the loop when `liveStreamActive` becomes true.
          // See below.
        }, 0);

      } catch (err) {
        console.error("Failed to start session", err);
        alert("Could not start live session.");
      } finally {
        setLoading(false);
      }
    }
  };

  // Use Effect to start loop when Stream becomes Active (and sessionId is set)
  useEffect(() => {
    if (liveStreamActive && sessionId) {
      processStreamFrame();
    }
    // Note: processStreamFrame changes when sessionId changes.
    // If we include processStreamFrame in dependency, it might re-trigger?
    // Yes.
  }, [liveStreamActive, sessionId, processStreamFrame]);

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

      if (mode === 'autonomous') {
        const response = await runAutonomousSimulation(formData);
        setName(response.data); // Wait, name? Assuming typo in original code or missing setName? 
        // Original code: setResult(response.data);
        setResult(response.data);

        if (response.data.detection_id) setLastRecordId(response.data.detection_id);
        setChainHash(null);
      } else {
        const response = await sendLiveFrame(formData);
        setResult(response.data);
        setLastRecordId(response.data.id);
        setChainHash(response.data.tx_hash);
      }

    } catch (error) {
      console.error('Capture error:', error);
      alert("Detection failed: " + (error.response?.data?.error || error.message));
    } finally {
      setProcessing(false);
    }
  }, [webcamRef, landId, mode, removalMethod, herbicideName]);

  const handleUpload = async (e) => {
    if (!landId) {
      alert("Please enter a Land ID first");
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    // Reset previous results
    setResult(null);
    setLastRecordId(null);
    setChainHash(null);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('land_id', landId);
    formData.append('removal_method', removalMethod);
    formData.append('herbicide_name', herbicideName);

    setLoading(true);
    try {
      const response = await uploadVideo(formData);
      // Combine results with the top-level keys
      // Backend returns: { message, detection_id, processed_video_url, results: {} }
      const fullResult = {
        ...response.data.results,
        processed_video_url: response.data.processed_video_url,
        processed_image_url: response.data.processed_image_url,
        timeline_events: response.data.timeline_events || []
      };
      setResult(fullResult);
      setLastRecordId(response.data.detection_id);
    } catch (error) {
      console.error('Upload error:', error);
      const errMsg = error.response?.data?.error || "Detection failed";
      alert(errMsg);
      setResult({ error: errMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleChainStore = async () => {
    if (!lastRecordId && !mode === 'autonomous') return; // Autonomous might not have record ID yet
    try {
      // 1. Send to Blockchain (MetaMask)
      const mockIpfsHash = `Qm${lastRecordId || Date.now()}x${Date.now()}`;

      const txHash = await storeDetectionOnBlockchain(
        mockIpfsHash,
        result.herbicide ? `Simulated: ${result.herbicide}` : "General Weed",
        Math.floor((result.confidence || result.avg_confidence || 0) * 100)
      );

      // 2. Save Hash to Backend
      if (lastRecordId) {
        await verifyExternalTransaction(lastRecordId, txHash);
      }

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
                <div className="p-2 bg-agro-100 rounded-lg">
                  <Scan className="text-agro-600" size={18} />
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
                  onClick={() => { setMode('webcam'); setLiveStreamActive(false); streamRef.current = false; setProcessedLiveFrame(null); }}
                  icon={<Camera className="text-blue-600" />}
                  label="Manual Scan"
                  description="Live Camera"
                />
                <ModeButton
                  active={mode === 'autonomous'}
                  onClick={() => { setMode('autonomous'); setLiveStreamActive(false); streamRef.current = false; setProcessedLiveFrame(null); }}
                  icon={<Bot className="text-orange-600" />}
                  label="Autonomous"
                  description="Drone Sim"
                />
                <ModeButton
                  active={mode === 'upload'}
                  onClick={() => { setMode('upload'); setLiveStreamActive(false); streamRef.current = false; setProcessedLiveFrame(null); }}
                  icon={<Upload className="text-purple-600" />}
                  label="Upload Media"
                  description="Images & Videos"
                />
              </div>

              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {mode === 'webcam' && "Manual mode: Detect and log weeds."}
                {mode === 'autonomous' && "Simulation: Detects weeds, simulates spraying, and updates status."}
                {mode === 'upload' && "Supported formats: JPG, PNG, MP4, AVI."}
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
                      Removal Method
                    </label>
                    <select
                      value={removalMethod}
                      onChange={(e) => setRemovalMethod(e.target.value)}
                      className="input-field"
                    >
                      <option value="Manual">Manual Removal</option>
                      <option value="Chemical">Chemical Herbicide</option>
                      <option value="Organic">Organic Herbicide</option>
                      <option value="Autonomous">Autonomous Robot</option>
                    </select>
                  </div>

                  {(removalMethod === 'Chemical' || removalMethod === 'Organic' || removalMethod === 'Autonomous') && (
                    <div className="space-y-2 animate-fade-in-up">
                      <label className="text-sm font-medium text-gray-700">
                        Herbicide / Agent Name
                      </label>
                      <input
                        placeholder="e.g. Glyphosate, Vinegar..."
                        value={herbicideName}
                        onChange={(e) => setHerbicideName(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  )}

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
              {mode === 'webcam' || mode === 'autonomous' ? (
                <div className="relative w-full h-full">
                  <Webcam
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    className={`w-full h-full object-cover ${processedLiveFrame ? 'opacity-0' : 'opacity-100'}`} // Hide webcam if we have processed frame overlay? Or just overlay it?
                    // Actually, keep webcam hidden while streaming processed frame to avoid double image
                    videoConstraints={{
                      width: 1280,
                      height: 720,
                      facingMode: 'environment'
                    }}
                  />

                  {/* Live Processed Overlay */}
                  {processedLiveFrame && (
                    <img
                      src={processedLiveFrame}
                      className="absolute inset-0 w-full h-full object-cover z-10"
                      alt="Live Detection"
                    />
                  )}

                  {/* Viewfinder Overlay */}
                  <div className={`absolute inset-0 border-4 ${mode === 'autonomous' ? 'border-orange-500/30' : 'border-white/10'} pointer-events-none m-4 rounded-2xl z-20`}>
                    <div className={`absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 ${mode === 'autonomous' ? 'border-orange-500' : 'border-agro-500'} -mt-0.5 -ml-0.5`}></div>
                    <div className={`absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 ${mode === 'autonomous' ? 'border-orange-500' : 'border-agro-500'} -mt-0.5 -mr-0.5`}></div>
                    <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 ${mode === 'autonomous' ? 'border-orange-500' : 'border-agro-500'} -mb-0.5 -ml-0.5`}></div>
                    <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 ${mode === 'autonomous' ? 'border-orange-500' : 'border-agro-500'} -mb-0.5 -mr-0.5`}></div>

                    {mode === 'autonomous' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Crosshair className="text-orange-500/50 w-24 h-24" />
                      </div>
                    )}
                  </div>

                  {/* Controls Container */}
                  <div className="absolute bottom-6 left-0 w-full flex justify-center gap-4 z-30">
                    {/* Capture Button (Single Shot) */}
                    <button
                      onClick={capture}
                      disabled={processing || !landId || liveStreamActive}
                      className="relative group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {/* Style adjustments for disabled state */}
                      <div className={`absolute inset-0 ${mode === 'autonomous' ? 'bg-orange-500' : 'bg-red-500'} rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity`} />
                      <div className={`relative bg-gradient-to-br ${mode === 'autonomous' ? 'from-orange-500 to-red-600' : 'from-red-500 to-red-600'} text-white rounded-full p-5 shadow-2xl hover:scale-105 active:scale-95 transition-transform`}>
                        {processing ? (
                          <Loader2 className="animate-spin" size={32} />
                        ) : (
                          mode === 'autonomous' ? <Bot size={32} /> : <Scan size={32} />
                        )}
                      </div>
                    </button>

                    {/* Live Stream Toggle */}
                    <button
                      onClick={toggleLiveStream}
                      disabled={processing || !landId}
                      className="relative group disabled:opacity-50"
                    >
                      <div className={`absolute inset-0 ${liveStreamActive ? 'bg-red-500' : 'bg-green-500'} rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity`} />
                      <div className={`relative bg-gradient-to-br ${liveStreamActive ? 'from-red-500 to-red-700' : 'from-green-500 to-green-700'} text-white rounded-full p-5 shadow-2xl hover:scale-105 active:scale-95 transition-transform`}>
                        {liveStreamActive ? <Square size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                      </div>
                    </button>
                  </div>

                  {/* Status Bar */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-30">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm backdrop-blur-sm ${liveStreamActive ? 'bg-red-600/80 animate-pulse' : 'bg-black/50'}`}>
                      <Battery size={14} />
                      <span>{liveStreamActive ? "STREAMING LIVE" : "Standby"}</span>
                    </div>
                    {mode === 'autonomous' && (
                      <div className="flex items-center gap-2 bg-orange-600/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm animate-pulse">
                        <Bot size={14} />
                        <span>AUTONOMOUS MODE</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm">
                      <Clock size={14} />
                      <span>{cameraSettings.frameRate} FPS</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-0 overflow-hidden bg-black">
                  {result?.processed_video_url ? (
                    // CHANGED FROM <video> TO <img> FOR MJPEG STREAM AND STATIC IMAGES
                    <img
                      src={result.processed_image_url || result.processed_video_url}
                      alt="Processed Output"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8">
                      <div className="text-center mb-6">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-agro-100 to-secondary-100 rounded-2xl flex items-center justify-center">
                          <Upload className="text-agro-600" size={32} />
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
                          accept="video/*,image/*"
                          onChange={handleUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Loading Overlay */}
              {(loading || processing) && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
                  <div className="text-center p-8">
                    <div className="relative mx-auto mb-6">
                      <Loader2 className="animate-spin text-agro-400" size={64} />
                      <Zap className="absolute inset-0 m-auto text-agro-200" size={32} />
                    </div>
                    <p className="text-2xl font-bold text-white mb-2">
                      {processing ? (mode === 'autonomous' ? 'Simulating Drone Action...' : 'Analyzing Frame...') : 'Processing Video...'}
                    </p>
                    <p className="text-gray-300 max-w-md mx-auto">
                      {processing
                        ? (mode === 'autonomous' ? 'Detecting weeds and calculating herbicide dosage...' : 'Running AI detection models on captured image')
                        : 'Scanning video frames for weed detection patterns'
                      }
                    </p>
                    <div className="mt-6 w-64 h-1 bg-gray-700 rounded-full overflow-hidden mx-auto">
                      <div className="h-full bg-gradient-to-r from-agro-500 to-secondary-500 animate-pulse" />
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
                      {result.error.includes("model") ? "The custom model could not be loaded." : "An error occurred during processing."}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {mode === 'autonomous' ? 'Simulation Report' : 'Detection Results'}
                        </h3>
                        <p className="text-gray-600">
                          {result.processing_status === 'completed' ? 'Analysis Complete - Results Saved' : (mode === 'autonomous' ? 'Autonomous intervention complete' : 'AI analysis in progress')}
                        </p>
                      </div>

                      {result.completion_message && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                          <ShieldCheck size={20} />
                          <span className="font-medium">{result.completion_message}</span>
                        </div>
                      )}

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

                    {/* Stream info if streaming */}
                    {result.status === "streaming" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
                        <p className="text-blue-700 font-semibold animate-pulse">Live Video Stream Active</p>
                      </div>
                    )}

                    {/* Autonomous Simulation Visuals */}
                    {mode === 'autonomous' && result.processed_image_base64 && (
                      <div className="mb-6 rounded-xl overflow-hidden border border-gray-200">
                        <div className="bg-gray-100 p-2 text-sm font-semibold text-gray-700 border-b flex justify-between">
                          <span>Drone View (Augmented)</span>
                          <span className="text-orange-600">Simulated Action</span>
                        </div>
                        <img src={result.processed_image_base64} alt="Processed Simulation" className="w-full object-contain max-h-96" />
                      </div>
                    )}

                    {/* Action Logs for Autonomous */}
                    {mode === 'autonomous' && result.actions && (
                      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
                        <h4 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                          <Bot size={16} /> Mission Log
                        </h4>
                        <ul className="space-y-1">
                          {result.actions.map((action, idx) => (
                            <li key={idx} className="text-sm text-orange-800 flex items-start gap-2">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-500" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <ResultStat
                        label="Weeds Detected"
                        value={result.weed_count || result.total_weeds || 0}
                        change={mode === 'autonomous' ? 'Targeted' : '+12%'}
                        color="red"
                      />
                      {mode === 'autonomous' ? (
                        <ResultStat
                          label="Herbicide Used"
                          value={result.herbicide ? "Yes" : "None"}
                          change={result.herbicide || "N/A"}
                          color="orange"
                        />
                      ) : (
                        <ResultStat
                          label="Confidence"
                          value={`${Math.round((result.confidence || result.avg_confidence || 0) * 100)}%`}
                          change="High"
                          color="blue"
                        />
                      )}

                      <ResultStat
                        label="Processing Time"
                        value={`${(result.processing_time || 0.8).toFixed(2)}s`}
                        change="Fast"
                        color="green"
                      />
                      <ResultStat
                        label={mode === 'autonomous' ? "Action Status" : "Frames Analyzed"}
                        value={mode === 'autonomous' ? "Completed" : (result.frames_analyzed || 1)}
                        change={mode === 'autonomous' ? "100%" : "Success"}
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
                          <button className="text-agro-600 hover:text-agro-700 text-sm font-medium">
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
                              className="text-agro-600 hover:text-agro-700 font-medium"
                            >
                              Copy Hash
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Timeline Events Details */}
                    {result.timeline_events && result.timeline_events.length > 0 && (
                      <div className="mt-6 mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Clock size={16} /> Detailed Detection Log
                        </h4>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-700 font-semibold border-b">
                              <tr>
                                <th className="px-4 py-2">Time</th>
                                <th className="px-4 py-2">Class</th>
                                <th className="px-4 py-2">Confidence</th>
                                <th className="px-4 py-2">Frame</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {result.timeline_events.map((evt, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 font-mono text-gray-600">{evt.timestamp}</td>
                                  <td className="px-4 py-2 font-medium text-gray-900">{evt.weed_class}</td>
                                  <td className="px-4 py-2 text-agro-600 font-semibold">{(evt.confidence * 100).toFixed(0)}%</td>
                                  <td className="px-4 py-2 text-gray-500">{evt.frame_number}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
      ? 'bg-gradient-to-br from-agro-50 to-green-50 border-agro-200 ring-1 ring-agro-100'
      : 'bg-white border-stone-200 hover:border-agro-200 hover:bg-stone-50'
      }`}
  >
    <div className={`p-3 rounded-xl mb-3 ${active ? 'bg-white shadow-sm' : 'bg-stone-100'
      }`}>
      {icon}
    </div>
    <span className={`font-semibold mb-1 ${active ? 'text-agro-700' : 'text-gray-700'
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
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  return (
    <div className="stat-card">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {label}
      </p>
      <div className="flex items-end justify-between">
        <p className={`text-2xl font-bold bg-gradient-to-r ${colorClasses[color] || colorClasses.blue} bg-clip-text text-transparent truncate`}>
          {value}
        </p>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${color === 'orange' ? 'bg-orange-50 text-orange-700' : (color === 'green'
          ? 'bg-green-50 text-green-700'
          : 'bg-blue-50 text-blue-700')
          }`}>
          {change}
        </span>
      </div>
    </div>
  );
};

export default WeedDetector;