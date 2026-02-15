import React, { useState, useEffect } from 'react';
import { getUserLands } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
    Sprout, MapPin, ChevronRight, PlusCircle,
    Tractor, Calendar, ExternalLink
} from 'lucide-react';

const MyAssets = ({ user }) => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchAssets = async () => {
            if (user?.id) {
                try {
                    const res = await getUserLands(user.id);
                    setAssets(res.data);
                } catch (err) {
                    console.error("Failed to fetch assets", err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchAssets();
    }, [user]);

    if (!user) return <div className="text-center p-10">Please log in.</div>;

    return (
        <div className="min-h-screen gradient-bg pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assets</h1>
                        <p className="text-gray-600">Manage and track your registered agricultural lands</p>
                    </div>
                    <button
                        onClick={() => navigate('/register')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <PlusCircle size={20} />
                        Register New Asset
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
                    </div>
                ) : assets.length === 0 ? (
                    <div className="glass-card rounded-2xl p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <Tractor className="text-gray-400" size={32} />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assets Found</h3>
                        <p className="text-gray-600 mb-6">You haven't registered any agricultural assets yet.</p>
                        <button onClick={() => navigate('/register')} className="btn-secondary">
                            Get Started
                        </button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {assets.map((asset) => (
                            <div
                                key={asset.id}
                                onClick={() => navigate('/dashboard', { state: { preloadedLandId: asset.id } })} // pass state to dashboard
                                className="group glass-card p-6 rounded-2xl cursor-pointer hover:shadow-xl transition-all border border-transparent hover:border-primary-200"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-green-100 rounded-xl group-hover:scale-110 transition-transform">
                                        <Sprout className="text-green-600" size={24} />
                                    </div>
                                    <div className="p-2 bg-gray-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink size={16} className="text-gray-500" />
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-1">{asset.farmer_name}</h3>
                                <div className="flex items-center text-sm text-gray-500 mb-4">
                                    <MapPin size={14} className="mr-1" />
                                    {asset.location}
                                </div>

                                <div className="space-y-3 pt-4 border-t border-gray-100">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Crop Type</span>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">{asset.crop_type}</span>
                                            {asset.farming_method && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${asset.farming_method === 'Organic'
                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                    {asset.farming_method}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Area</span>
                                        <span className="font-medium text-gray-900">{asset.area_size} Acres</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Planted</span>
                                        <span className="font-medium text-gray-900">
                                            {asset.planting_date ? new Date(asset.planting_date).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyAssets;
