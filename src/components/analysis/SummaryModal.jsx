import React from "react";
import { FaGoogle, FaTimes, FaFacebook, FaChartBar, FaLinkedin, FaPinterest, FaMicrosoft, FaCog, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { MdEmail } from "react-icons/md";

export default function SummaryModal({ isOpen, onClose, analysisData, containerId }) {
    if (!isOpen || !analysisData) return null;

    const parseMessageData = (data) => {
        if (!data) return null;

        let parsedMessage;
        if (data.message && typeof data.message === 'string') {
            try {
                parsedMessage = JSON.parse(data.message);
            } catch (e) {
                console.error('Failed to parse message:', e);
                return null;
            }
        }

        return parsedMessage;
    };

    const messageData = parseMessageData(analysisData);

    // Extract summary statistics
    const getSummaryStats = () => {
        if (!messageData) return null;

        const stats = {
            ga4Events: 0,
            ga4Streams: 0,
            metaEvents: 0,
            googleAdsEvents: 0,
            linkedinEvents: 0,
            klaviyoEvents: 0,
            pinterestEvents: 0,
            microsoftEvents: 0,
            otherTech: 0,
            totalTags: 0,
            totalTriggers: 0,
            totalVariables: 0,
            hasConsentMode: false,
            isServerSide: false,
            cmpName: null
        };

        Object.keys(messageData).forEach(key => {
            const data = messageData[key];

            if (data?.entityType === 'GA4 Stream') {
                stats.ga4Streams++;
            }

            if (data?.entityType === 'GTM Container' && data.tags) {
                stats.totalTags = data.tags.length;
                stats.totalTriggers = data.triggers?.length || 0;
                stats.totalVariables = data.variables?.length || 0;
                stats.hasConsentMode = data.hasConsentMode || false;
                stats.isServerSide = data.isServerSide || false;
                stats.cmpName = data.cmpName || null;

                data.tags.forEach(tag => {
                    if (tag.type === 'gaawe') stats.ga4Events++;
                    else if (tag.type === 'awct') stats.googleAdsEvents++;
                    else if (tag.type === 'linkedin_insight' || tag.name?.toLowerCase().includes('linkedin')) stats.linkedinEvents++;
                    else if (tag.type === 'klaviyo' || tag.name?.toLowerCase().includes('klaviyo')) stats.klaviyoEvents++;
                    else if (tag.type === 'pinterest_tag' || tag.name?.toLowerCase().includes('pinterest')) stats.pinterestEvents++;
                    else if (tag.type === 'bing_ads' || tag.type === 'microsoft_ads' || tag.name?.toLowerCase().includes('microsoft')) stats.microsoftEvents++;
                    else if (tag.name?.toLowerCase().includes('facebook') || tag.name?.toLowerCase().includes('meta')) stats.metaEvents++;
                    else stats.otherTech++;
                });
            }
        });

        return stats;
    };

    const stats = getSummaryStats();

    if (!stats) {
        return (
            <div className="glass-morph-dark fixed inset-0 flex items-center justify-center z-50 pt-40">
                <div className="bg-white rounded-lg shadow-lg w-96 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Summary</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <FaTimes size={20} />
                        </button>
                    </div>
                    <p className="text-gray-500">No data available for summary.</p>
                </div>
            </div>
        );
    }

    const platforms = [
        { name: 'GA4', icon: FaGoogle, events: stats.ga4Events, streams: stats.ga4Streams, color: 'text-blue-500' },
        { name: 'Meta', icon: FaFacebook, events: stats.metaEvents, color: 'text-blue-600' },
        { name: 'Google Ads', icon: FaChartBar, events: stats.googleAdsEvents, color: 'text-green-500' },
        { name: 'LinkedIn', icon: FaLinkedin, events: stats.linkedinEvents, color: 'text-blue-700' },
        { name: 'Klaviyo', icon: MdEmail, events: stats.klaviyoEvents, color: 'text-orange-500' },
        { name: 'Pinterest', icon: FaPinterest, events: stats.pinterestEvents, color: 'text-red-500' },
        { name: 'Microsoft', icon: FaMicrosoft, events: stats.microsoftEvents, color: 'text-blue-400' },
        { name: 'Other', icon: FaCog, events: stats.otherTech, color: 'text-gray-500' }
    ];

    const activePlatforms = platforms.filter(p => p.events > 0 || (p.name === 'GA4' && p.streams > 0));
    const totalEvents = stats.ga4Events + stats.metaEvents + stats.googleAdsEvents + stats.linkedinEvents +
        stats.klaviyoEvents + stats.pinterestEvents + stats.microsoftEvents + stats.otherTech;

    return (
        <div className="glass-morph-dark fixed inset-0 flex items-center justify-center z-50 pt-40">
            <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold">Container Summary</h2>
                            <p className="text-sm text-gray-600">{containerId}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <FaTimes size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Overview Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">{totalEvents}</div>
                            <div className="text-sm text-blue-800">Total Events</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.totalTags}</div>
                            <div className="text-sm text-green-800">Tags</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">{stats.totalTriggers}</div>
                            <div className="text-sm text-purple-800">Triggers</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-orange-600">{stats.totalVariables}</div>
                            <div className="text-sm text-orange-800">Variables</div>
                        </div>
                    </div>

                    {/* Platform Breakdown */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Marketing Platforms</h3>
                        {activePlatforms.length > 0 ? (
                            <div className="space-y-3">
                                {activePlatforms.map((platform, index) => {
                                    const Icon = platform.icon;
                                    return (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <Icon className={`${platform.color} text-xl`} />
                                                <span className="font-medium">{platform.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold">
                                                    {platform.events} event{platform.events !== 1 ? 's' : ''}
                                                </div>
                                                {platform.name === 'GA4' && platform.streams > 0 && (
                                                    <div className="text-xs text-gray-500">
                                                        + {platform.streams} stream{platform.streams !== 1 ? 's' : ''}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No marketing platforms detected
                            </div>
                        )}
                    </div>

                    {/* Configuration Status */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Configuration Status</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                {stats.hasConsentMode ? (
                                    <FaCheckCircle className="text-green-500" />
                                ) : (
                                    <FaExclamationTriangle className="text-orange-500" />
                                )}
                                <span>Consent Mode: {stats.hasConsentMode ? 'Enabled' : 'Disabled'}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <FaCheckCircle className={stats.isServerSide ? 'text-green-500' : 'text-blue-500'} />
                                <span>Container Type: {stats.isServerSide ? 'Server-side' : 'Client-side'}</span>
                            </div>

                            {stats.cmpName && (
                                <div className="flex items-center gap-3">
                                    <FaCheckCircle className="text-green-500" />
                                    <span>CMP: {stats.cmpName}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Health Score */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Health Score</h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <span>Configuration Health</span>
                                <span className="font-bold">
                                    {stats.hasConsentMode && activePlatforms.length > 0 ? 'Good' :
                                        activePlatforms.length > 0 ? 'Fair' : 'Needs Attention'}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${stats.hasConsentMode && activePlatforms.length > 0 ? 'bg-green-500 w-4/5' :
                                            activePlatforms.length > 0 ? 'bg-yellow-500 w-3/5' : 'bg-red-500 w-2/5'
                                        }`}
                                ></div>
                            </div>
                            <div className="mt-2 text-xs text-gray-600">
                                {stats.hasConsentMode && activePlatforms.length > 0 ?
                                    'Container is well configured with consent management' :
                                    activePlatforms.length > 0 ?
                                        'Container has tracking but consider enabling consent mode' :
                                        'Container needs configuration improvements'
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}