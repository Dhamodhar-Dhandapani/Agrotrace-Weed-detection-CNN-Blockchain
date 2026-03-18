import React, { useState } from 'react';
import { verifyLocation } from '../services/api';
import { suggestLocation } from '../services/api';
import { useRef } from "react";

import { registerLand, getQr } from '../services/api';
import {
  Loader2, Sprout, User, CheckCircle2, Copy,
  MapPin, Calendar, Droplets, Hash, Globe,
  Upload, Scan, ArrowLeft, Download, Share2,
  ShieldCheck
} from 'lucide-react';

const LandRegister = () => {
  const [formData, setFormData] = useState({
    farmer_name: '', location: '', crop_type: '', crop_id: '',
    soil_type: '', water_source: '', planting_date: '', area_size: '',
    user_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [locationValid, setLocationValid] = useState(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState([]);




  const requestRef = useRef(0);
  const debounceRef = useRef(null);

const handleChange = (e) => {
  const { name, value } = e.target;

  setFormData({ ...formData, [name]: value });

 if (name === "location") {

  // 🔽 clear previous timer
  if (debounceRef.current) {
    clearTimeout(debounceRef.current);
  }

  // 🔽 set new timer
  debounceRef.current = setTimeout(() => {
    if (value.length >= 3) {
      suggestLocation(value)
        .then(res => setSuggestions(res.data))
        .catch(() => setSuggestions([]));
    } else {
      setSuggestions([]);
    }
  }, 500); // ⏱ wait 500ms

  // 🔽 validation stays SAME
  if (value.length < 5) {
    setLocationValid(null);
    return;
  }

  const requestId = ++requestRef.current;
  setCheckingLocation(true);

  verifyLocation(value)
    .then(res => {
      if (requestId === requestRef.current) {
        setLocationValid(res.data.valid);
      }
    })
    .catch(() => {
      if (requestId === requestRef.current) {
        setLocationValid(false);
      }
    })
    .finally(() => {
      if (requestId === requestRef.current) {
        setCheckingLocation(false);
      }
    });
}
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Get user from local storage if available
    const user = JSON.parse(localStorage.getItem('user'));
    const payload = { ...formData, user_id: user?.id };

    try {
      const res = await registerLand(payload);
      setResult(res.data.land);
      setCurrentStep(3);
    } catch (error) {
      alert("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const steps = [
    { id: 1, title: 'Basic Information' },
    { id: 2, title: 'Agricultural Details' },
    { id: 3, title: 'Confirmation' }
  ];

  return (
    <div className="min-h-screen gradient-bg pt-24 pb-12 px-4 sm:px-6 lg:px-8">
    <div className="max-w-4xl mx-auto">
    {/* Header */}
    <div className="text-center mb-8">
    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
    Register New Asset
    </h1>
    <p className="text-gray-600">
    Create a digital identity for your agricultural land with blockchain verification
    </p>
    </div>

    {/* Progress Steps */}
    <div className="mb-8">
    <div className="flex items-center justify-between relative">
    {/* Progress line */}
    <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10">
    <div
    className="h-full bg-agro-600 transition-all duration-500"
    style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
    />
    </div>

    {steps.map((step) => (
      <div key={step.id} className="flex flex-col items-center">
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
        ${step.id <= currentStep
          ? 'bg-agro-600 text-white'
          : 'bg-stone-200 text-gray-500'
        }
        `}>
        {step.id}
        </div>
        <span className={`text-sm mt-2 font-medium ${step.id <= currentStep ? 'text-gray-900' : 'text-gray-500'
        }`}>
        {step.title}
        </span>
        </div>
    ))}
    </div>
    </div>

    {/* Form Container */}
    <div className="glass-card rounded-2xl overflow-hidden">
    {!result ? (
      <form onSubmit={handleSubmit} className="p-6 md:p-8">
      {currentStep === 1 && (
        <StepOne
  formData={formData}
  onChange={handleChange}
  onNext={() => setCurrentStep(2)}
  checkingLocation={checkingLocation}
  locationValid={locationValid}
  suggestions={suggestions}
  setSuggestions={setSuggestions}
  setFormData={setFormData}
  setLocationValid={setLocationValid}
/>
      )}

      {currentStep === 2 && (
        <StepTwo
        formData={formData}
        onChange={handleChange}
        onBack={() => setCurrentStep(1)}
        loading={loading}
        />
      )}
      </form>
    ) : (
      <SuccessView
      result={result}
      onReset={() => {
        setResult(null);
        setFormData({
          farmer_name: '', location: '', crop_type: '', crop_id: '',
          soil_type: '', water_source: '', planting_date: '', area_size: ''
        });
        setCurrentStep(1);
      }}
      />
    )}
    </div>
    </div>
    </div>
  );
};

const StepOne = ({
  formData,
  onChange,
  onNext,
  checkingLocation,
  locationValid,
  suggestions,
  setSuggestions,
  setFormData,
  setLocationValid
}) => {
  const isValid = formData.farmer_name && locationValid === true;

  return (
    <div className="animate-fade-in-up">
    <div className="flex items-center gap-3 mb-6">
    <div className="p-2 bg-agro-100 rounded-lg">
    <User className="text-agro-600" size={20} />
    </div>
    <h2 className="text-xl font-bold text-gray-900">
    Ownership Details
    </h2>
    </div>

    <div className="space-y-6">
    <div className="grid md:grid-cols-2 gap-6">
    <FormField
    label="Farmer Name"
    name="farmer_name"
    value={formData.farmer_name}
    onChange={onChange}
    placeholder="Enter legal owner name"
    icon={<User size={16} />}
    required
    />
    <div>
  <FormField
    label="Location"
    name="location"
    value={formData.location}
    onChange={onChange}
    placeholder="District, State, Country"
    icon={<MapPin size={16} />}
    required
  />

  {/* 🔽 Suggestions dropdown */}
  {suggestions.length > 0 && (
    <div className="bg-white border rounded mt-1 max-h-40 overflow-y-auto">
      {suggestions.map((s, i) => (
        <div
          key={i}
          className="p-2 hover:bg-gray-100 cursor-pointer"
          onClick={() => {
            setFormData({ ...formData, location: s.name });
            setSuggestions([]);
            setLocationValid(true);
          }}
        >
          {s.name}
        </div>
      ))}
    </div>
  )}

  {/* 🔽 Validation status */}
  <div className="mt-2 text-sm">
    {checkingLocation && <p>Checking location...</p>}

    {locationValid === true && (
      <p style={{ color: "green" }}>✔ Valid location</p>
    )}

    {locationValid === false && (
      <p style={{ color: "red" }}>✖ Invalid location</p>
    )}
  </div>
</div>
    </div>
    </div>

    <div className="pt-4">
    <button
    type="button"
    onClick={onNext}
    disabled={!isValid}
    className="btn-primary w-full"
    >
    Continue to Details
    <ArrowLeft className="rotate-180" size={18} />
    </button>
    </div>
    </div>
  );
};

const StepTwo = ({ formData, onChange, onBack, loading }) => {
  return (
    <div className="animate-fade-in-up">
    <div className="flex items-center gap-3 mb-6">
    <div className="p-2 bg-green-100 rounded-lg">
    <Sprout className="text-green-600" size={20} />
    </div>
    <h2 className="text-xl font-bold text-gray-900">
    Agricultural Details
    </h2>
    </div>

    <div className="space-y-6">
    <div className="grid md:grid-cols-2 gap-6">
    <FormField
    label="Crop Variety"
    name="crop_type"
    value={formData.crop_type}
    onChange={onChange}
    placeholder="e.g., Zea Mays (Corn)"
    icon={<Sprout size={16} />}
    required
    />
    <FormField
    label="Batch ID (Optional)"
    name="crop_id"
    value={formData.crop_id}
    onChange={onChange}
    placeholder="Internal batch identifier"
    icon={<Hash size={16} />}
    />
    <FormField
    label="Soil Type"
    name="soil_type"
    value={formData.soil_type}
    onChange={onChange}
    placeholder="e.g., Silty Loam"
    icon={<Globe size={16} />}
    />
    <FormField
    label="Water Source"
    name="water_source"
    value={formData.water_source}
    onChange={onChange}
    placeholder="e.g., Drip Irrigation"
    icon={<Droplets size={16} />}
    />
    <div className="space-y-2">
    <label className="text-sm font-semibold text-gray-700">
    Planting Date
    </label>
    <div className="relative">
    <Calendar className="absolute left-3 top-3.5 text-gray-400" size={16} />
    <input
    type="date"
    name="planting_date"
    value={formData.planting_date}
    onChange={onChange}
    className="input-field pl-10"
    />
    </div>
    </div>
    <FormField
    label="Area Size (Acres)"
    name="area_size"
    type="number"
    value={formData.area_size}
    onChange={onChange}
    placeholder="0.00"
    step="0.1"
    required
    />

    <div className="md:col-span-2 space-y-4 border-t pt-4 mt-2">
    <label className="text-sm font-semibold text-gray-700 block">
    Farming Method
    </label>
    <div className="flex gap-6">
    <label className="flex items-center gap-2 cursor-pointer">
    <input
    type="radio"
    name="farming_method"
    value="Conventional"
    checked={formData.farming_method !== 'Organic'}
    onChange={onChange}
    className="w-4 h-4 text-agro-600 focus:ring-agro-500"
    />
    <span className="text-gray-700">Conventional Farming</span>
    </label>
    <label className="flex items-center gap-2 cursor-pointer">
    <input
    type="radio"
    name="farming_method"
    value="Organic"
    checked={formData.farming_method === 'Organic'}
    onChange={onChange}
    className="w-4 h-4 text-green-600 focus:ring-green-500"
    />
    <span className="text-gray-700">Organic Farming</span>
    </label>
    </div>

    {formData.farming_method === 'Organic' && (
      <div className="animate-fade-in-up">
      <FormField
      label="Organic Certificate Number"
      name="organic_certificate_number"
      value={formData.organic_certificate_number || ''}
      onChange={onChange}
      placeholder="Enter valid certificate ID"
      icon={<ShieldCheck size={16} />}
      required
      />
      </div>
    )}
    </div>
    </div>

    <div className="pt-4 flex gap-4">
    <button
    type="button"
    onClick={onBack}
    className="btn-secondary flex-1"
    >
    <ArrowLeft size={18} />
    Back
    </button>
    <button
    type="submit"
    disabled={loading}
    className="btn-primary flex-1"
    >
    {loading ? (
      <>
      <Loader2 className="animate-spin" size={18} />
      Registering...
      </>
    ) : (
      <>
      <Scan size={18} />
      Register Asset
      </>
    )}
    </button>
    </div>
    </div>
    </div>
  );
};

const FormField = ({ label, name, value, onChange, placeholder, icon, type = "text", required, step }) => (
  <div className="space-y-2">
  <label className="text-sm font-semibold text-gray-700">
  {label}
  {required && <span className="text-red-500 ml-1">*</span>}
  </label>
  <div className="relative">
  {icon && (
    <div className="absolute left-3 top-3.5 text-gray-400">
    {icon}
    </div>
  )}
  <input
  name={name}
  type={type}
  step={step}
  required={required}
  value={value}
  onChange={onChange}
  className={`input-field ${icon ? 'pl-10' : ''}`}
  placeholder={placeholder}
  />
  </div>
  </div>
);

const SuccessView = ({ result, onReset }) => (
  <div className="p-8 text-center animate-fade-in-up">
  {/* Success Icon */}
  <div className="flex justify-center mb-6">
  <div className="relative">
  <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center">
  <CheckCircle2 size={48} className="text-green-600" />
  </div>
  <div className="absolute inset-0 animate-ping rounded-full bg-green-200 opacity-75" />
  </div>
  </div>

  {/* Success Message */}
  <h2 className="text-2xl font-bold text-gray-900 mb-2">
  Asset Registered Successfully!
  </h2>
  <p className="text-gray-600 mb-8 max-w-md mx-auto">
  Your agricultural asset has been registered on the blockchain network with a unique digital identity.
  </p>

  {/* Asset ID */}
  <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl p-6 mb-8 border border-primary-100">
  <div className="flex items-center justify-between mb-4">
  <div className="text-left">
  <p className="text-sm font-semibold text-gray-500">Asset ID</p>
  <p className="font-mono text-lg font-bold text-gray-900">{result.id}</p>
  </div>
  <button
  onClick={() => navigator.clipboard.writeText(result.id)}
  className="btn-secondary text-sm"
  >
  <Copy size={14} />
  Copy
  </button>
  </div>
  <div className="text-xs text-gray-500 text-left">
  Use this ID to track and verify your asset across the platform
  </div>
  </div>

  {/* QR Code */}
  <div className="mb-8">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">
  Digital Verification QR
  </h3>
  <div className="inline-block p-4 bg-white rounded-2xl shadow-lg">
  <img
  src={getQr(result.id)}
  alt="QR Code"
  className="w-48 h-48"
  />
  </div>
  </div>

  {/* Action Buttons */}
  <div className="flex flex-col sm:flex-row gap-4 justify-center">
  <button
  onClick={() => window.print()}
  className="btn-secondary"
  >
  <Download size={18} />
  Download Certificate
  </button>
  <button className="btn-secondary">
  <Share2 size={18} />
  Share Asset
  </button>
  <button
  onClick={onReset}
  className="btn-primary"
  >
  Register Another Asset
  </button>
  </div>
  </div>
);

export default LandRegister;
