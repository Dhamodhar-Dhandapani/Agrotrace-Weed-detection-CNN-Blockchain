import React, { useState, useEffect } from 'react';
import { getUserProfile } from '../services/api';
import { User, Mail, Calendar, ShieldCheck } from 'lucide-react';

const Profile = ({ user }) => {
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (user?.id) {
                try {
                    const res = await getUserProfile(user.id);
                    setProfileData(res.data);
                } catch (err) {
                    console.error("Failed to fetch profile", err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchProfile();
    }, [user]);

    if (!user) return <div className="text-center p-10">Please log in.</div>;
    if (loading) return <div className="text-center p-10">Loading profile...</div>;

    return (
        <div className="min-h-screen gradient-bg pt-24 pb-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">User Profile</h1>

                <div className="glass-card rounded-2xl p-8">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="text-primary-600 w-12 h-12" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{profileData?.username || user.username}</h2>
                            <div className="flex items-center text-green-600 mt-2 gap-1">
                                <ShieldCheck size={16} />
                                <span className="text-sm font-medium">Verified Account</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6">
                        <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-4">
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <Mail className="text-gray-500" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Email Address</p>
                                <p className="font-medium text-gray-900">{profileData?.email || user.email}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-4">
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <Calendar className="text-gray-500" size={20} />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">Member Since</p>
                                <p className="font-medium text-gray-900">
                                    {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-4">
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <div className="font-mono text-xs font-bold text-gray-500">UID</div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 mb-1">User ID</p>
                                <p className="font-mono text-sm text-gray-900">{profileData?.id || user.id}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
