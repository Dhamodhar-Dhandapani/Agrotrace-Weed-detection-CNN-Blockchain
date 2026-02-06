import React from 'react';
import { Link } from 'react-router-dom';
import {
  Leaf, Shield, Database, ArrowRight, Check, Zap,
  Lock, Globe, Cpu, BarChart, Users, ShieldCheck,
  Target, Cloud, GitBranch, Award
} from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '1s' }} />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center">
            {/* Badge */}


            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8">
              <span className="block">Agricultural</span>
              <span className="gradient-text block">Traceing</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              Combining computer vision with blockchain technology to create
              immutable, transparent supply chains for sustainable agriculture.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Link
                to="/register"
                className="btn-primary text-lg px-8 py-4"
              >
                Register Land Asset
                <ArrowRight size={20} />
              </Link>
              <Link
                to="/dashboard"
                className="btn-secondary text-lg px-8 py-4"
              >
                <Database size={20} />
                View Details
              </Link>
            </div>


          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Enterprise-Grade Architecture
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Built on a foundation of cutting-edge technologies for
              reliability, security, and scalability.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Cpu className="text-blue-500" size={32} />}
              title="Computer Vision Engine"
              description="Real-time weed detection using YOLOv8 with multi-model ensemble for high accuracy."
              features={["Real-time Processing", "Multi-model Ensemble"]}
              color="blue"
            />
            <FeatureCard
              icon={<GitBranch className="text-green-500" size={32} />}
              title="Blockchain Ledger"
              description="Immutable record-keeping with cryptographic verification and smart contract integration."
              features={["SHA-256 Hashing", "Smart Contracts"]}
              color="green"
            />
            <FeatureCard
              icon={<Database className="text-purple-500" size={32} />}
              title="Digital Identity"
              description="Unique cryptographic IDs for every asset with QR-based verification system."
              features={["UUID Generation", "QR Verification"]}
              color="purple"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              A seamless process from asset registration to blockchain verification
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <StepCard
              number="01"
              title="Asset Registration"
              description="Create digital identity with comprehensive metadata"
              icon={<Database className="text-primary-600" />}
            />
            <StepCard
              number="02"
              title="AI Detection"
              description="Real-time weed detection using computer vision"
              icon={<Cpu className="text-primary-600" />}
            />
            <StepCard
              number="03"
              title="Blockchain Recording"
              description="Immutable storage of detection events"
              icon={<Lock className="text-primary-600" />}
            />
            <StepCard
              number="04"
              title="Traceability"
              description="Complete audit trail and verification"
              icon={<ShieldCheck className="text-primary-600" />}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

const TrustIndicator = ({ icon, value, label }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-lg">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gray-100 rounded-lg">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600">{label}</div>
      </div>
    </div>
  </div>
);

const FeatureCard = ({ icon, title, description, features, color }) => {
  const colorClasses = {
    blue: 'border-blue-200 hover:border-blue-300',
    green: 'border-green-200 hover:border-green-300',
    purple: 'border-purple-200 hover:border-purple-300',
    cyan: 'border-cyan-200 hover:border-cyan-300',
    amber: 'border-amber-200 hover:border-amber-300',
    pink: 'border-pink-200 hover:border-pink-300',
  };

  return (
    <div className={`glass-card rounded-2xl p-6 border-2 ${colorClasses[color]} card-hover`}>
      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      <div className="flex flex-wrap gap-2">
        {features.map((feature) => (
          <span
            key={feature}
            className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full"
          >
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
};

const StepCard = ({ number, title, description, icon }) => (
  <div className="relative">
    <div className="glass-card rounded-2xl p-6 text-center">
      <div className="text-4xl font-bold text-primary-100 mb-4">{number}</div>
      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  </div>
);

export default Home;