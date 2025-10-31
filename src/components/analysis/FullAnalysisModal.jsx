import React, { useState } from "react";
import { FaGoogle, FaTimes, FaFacebook, FaChartBar, FaCog, FaLinkedin, FaPinterest, FaMicrosoft } from "react-icons/fa";
import { SiKlaviyo } from "react-icons/si";
import { MdEmail } from "react-icons/md";

export default function FullAnalysisModal({ isOpen, onClose, analysisData }) {
    const [activeTab, setActiveTab] = useState('ga4');

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

    const extractGA4Events = (messageData) => {
        if (!messageData) return [];

        const events = [];

        Object.keys(messageData).forEach(key => {
            const containerData = messageData[key];

            if (containerData?.entityType === 'GTM Container' && containerData.tags) {
                containerData.tags.forEach(tag => {
                    if (tag.type === 'gaawe') {
                        tag.parameters.forEach(param => {
                            if (param.key === 'vtp_eventName') {
                                events.push({
                                    name: param.value,
                                    type: 'GA4 Event',
                                    details: tag,
                                    triggers: tag.triggers || []
                                });
                            }
                        });
                    }
                });
            }
        });

        return events;
    };

    const extractMetaEvents = (messageData) => {
        if (!messageData) return [];

        const events = [];

        Object.keys(messageData).forEach(key => {
            const containerData = messageData[key];

            if (containerData?.entityType === 'GTM Container' && containerData.tags) {
                containerData.tags.forEach(tag => {
                    if (tag.type === 'cvt_template' || tag.name?.toLowerCase().includes('facebook') ||
                        tag.name?.toLowerCase().includes('meta') || tag.name?.toLowerCase().includes('pixel')) {

                        const eventParam = tag.parameters?.find(p =>
                            p.key === 'vtp_eventName' || p.key === 'eventName' || p.key === 'event'
                        );

                        if (eventParam) {
                            events.push({
                                name: eventParam.value || 'Unknown Meta Event',
                                type: 'Meta Pixel Event',
                                details: tag,
                                triggers: tag.triggers || []
                            });
                        }
                    }
                });
            }
        });

        return events;
    };

    const extractGoogleAdsEvents = (messageData) => {
        if (!messageData) return [];

        const events = [];

        Object.keys(messageData).forEach(key => {
            const containerData = messageData[key];

            if (containerData?.entityType === 'GTM Container' && containerData.tags) {
                containerData.tags.forEach(tag => {
                    if (tag.type === 'awct' || tag.name?.toLowerCase().includes('google ads') ||
                        tag.name?.toLowerCase().includes('conversion')) {

                        events.push({
                            name: tag.name || 'Google Ads Conversion',
                            type: 'Google Ads Event',
                            details: tag,
                            triggers: tag.triggers || []
                        });
                    }
                });
            }
        });

        return events;
    };

    const extractLinkedInEvents = (messageData) => {
        if (!messageData) return [];

        const events = [];

        Object.keys(messageData).forEach(key => {
            const containerData = messageData[key];

            if (containerData?.entityType === 'GTM Container' && containerData.tags) {
                containerData.tags.forEach(tag => {
                    if (tag.type === 'linkedin_insight' || tag.name?.toLowerCase().includes('linkedin') ||
                        tag.name?.toLowerCase().includes('li_') || tag.name?.toLowerCase().includes('insight')) {

                        events.push({
                            name: tag.name || 'LinkedIn Insight Tag',
                            type: 'LinkedIn Event',
                            details: tag,
                            triggers: tag.triggers || []
                        });
                    }
                });
            }
        });

        return events;
    };

    const extractKlaviyoEvents = (messageData) => {
        if (!messageData) return [];

        const events = [];

        Object.keys(messageData).forEach(key => {
            const containerData = messageData[key];

            if (containerData?.entityType === 'GTM Container' && containerData.tags) {
                containerData.tags.forEach(tag => {
                    if (tag.type === 'klaviyo' || tag.name?.toLowerCase().includes('klaviyo') ||
                        tag.name?.toLowerCase().includes('kl_')) {

                        events.push({
                            name: tag.name || 'Klaviyo Event',
                            type: 'Klaviyo Event',
                            details: tag,
                            triggers: tag.triggers || []
                        });
                    }
                });
            }
        });

        return events;
    };

    const extractPinterestEvents = (messageData) => {
        if (!messageData) return [];

        const events = [];

        Object.keys(messageData).forEach(key => {
            const containerData = messageData[key];

            if (containerData?.entityType === 'GTM Container' && containerData.tags) {
                containerData.tags.forEach(tag => {
                    if (tag.type === 'pinterest_tag' || tag.name?.toLowerCase().includes('pinterest') ||
                        tag.name?.toLowerCase().includes('pin_')) {

                        events.push({
                            name: tag.name || 'Pinterest Tag',
                            type: 'Pinterest Event',
                            details: tag,
                            triggers: tag.triggers || []
                        });
                    }
                });
            }
        });

        return events;
    };

    const extractMicrosoftEvents = (messageData) => {
        if (!messageData) return [];

        const events = [];

        Object.keys(messageData).forEach(key => {
            const containerData = messageData[key];

            if (containerData?.entityType === 'GTM Container' && containerData.tags) {
                containerData.tags.forEach(tag => {
                    if (tag.type === 'bing_ads' || tag.type === 'microsoft_ads' || 
                        tag.name?.toLowerCase().includes('microsoft') ||
                        tag.name?.toLowerCase().includes('bing') ||
                        tag.name?.toLowerCase().includes('msft')) {

                        events.push({
                            name: tag.name || 'Microsoft Ads Event',
                            type: 'Microsoft Ads Event',
                            details: tag,
                            triggers: tag.triggers || []
                        });
                    }
                });
            }
        });

        return events;
    };

    const extractOtherTech = (messageData) => {
        if (!messageData) return [];

        const events = [];

        Object.keys(messageData).forEach(key => {
            const containerData = messageData[key];

            if (containerData?.entityType === 'GTM Container' && containerData.tags) {
                containerData.tags.forEach(tag => {
                    if (tag.type !== 'gaawe' && tag.type !== 'awct' && 
                        tag.type !== 'linkedin_insight' && tag.type !== 'klaviyo' && 
                        tag.type !== 'pinterest_tag' && tag.type !== 'bing_ads' && 
                        tag.type !== 'microsoft_ads' &&
                        !tag.name?.toLowerCase().includes('facebook') &&
                        !tag.name?.toLowerCase().includes('meta') &&
                        !tag.name?.toLowerCase().includes('google ads') &&
                        !tag.name?.toLowerCase().includes('linkedin') &&
                        !tag.name?.toLowerCase().includes('klaviyo') &&
                        !tag.name?.toLowerCase().includes('pinterest') &&
                        !tag.name?.toLowerCase().includes('microsoft') &&
                        !tag.name?.toLowerCase().includes('bing')) {

                        events.push({
                            name: tag.name || `${tag.type} Tag`,
                            type: getTagTypeName(tag.type) || 'Other Technology',
                            details: tag,
                            triggers: tag.triggers || []
                        });
                    }
                });
            }
        });

        return events;
    };

    const getTagTypeName = (tagType) => {
        const tagTypeMap = {
            'googtag': 'Google Tag',
            'gclidw': 'Conversion Linker',
            'html': 'Custom HTML',
            'img': 'Image Tag',
            'ua': 'Universal Analytics',
            'flc': 'Floodlight Counter',
            'fls': 'Floodlight Sales',
            'sp': 'Salesforce Pardot',
            'bzi': 'Bizible',
            'twitter_website_tag': 'Twitter Pixel',
            'linkedin_insight': 'LinkedIn Insight Tag',
            'pinterest_tag': 'Pinterest Tag',
            'snapchat_ads': 'Snapchat Ads',
            'tiktok_ads': 'TikTok Ads',
            'criteo_onetagv2': 'Criteo OneTag',
            'hotjar': 'Hotjar',
            'mouseflow': 'Mouseflow',
            'fullstory': 'FullStory',
            'crazyegg': 'Crazy Egg',
            'klaviyo': 'Klaviyo',
            'klaviyo_pixel': 'Klaviyo Pixel',
            'bing_ads': 'Microsoft Advertising (Bing)',
            'microsoft_ads': 'Microsoft Advertising',
            'msft_uet': 'Microsoft UET Tag',
            'pinterest_conversion': 'Pinterest Conversion',
            'pinterest_pixel': 'Pinterest Pixel'
        };

        return tagTypeMap[tagType] || tagType;
    };

    const ga4Events = extractGA4Events(messageData);
    const metaEvents = extractMetaEvents(messageData);
    const googleAdsEvents = extractGoogleAdsEvents(messageData);
    const linkedinEvents = extractLinkedInEvents(messageData);
    const klaviyoEvents = extractKlaviyoEvents(messageData);
    const pinterestEvents = extractPinterestEvents(messageData);
    const microsoftEvents = extractMicrosoftEvents(messageData);
    const otherTech = extractOtherTech(messageData);

    const ga4Streams = messageData ? Object.keys(messageData)
        .filter(key => messageData[key]?.entityType === 'GA4 Stream')
        .map(key => ({
            id: key,
            ...messageData[key]
        })) : [];

    const gtmContainers = messageData ? Object.keys(messageData)
        .filter(key => messageData[key]?.entityType === 'GTM Container')
        .map(key => ({
            id: key,
            ...messageData[key]
        })) : [];

    const tabs = [
        {
            id: 'ga4',
            label: 'GA4',
            icon: FaGoogle,
            count: ga4Events.length + ga4Streams.length,
            color: 'text-gtm-primary'
        },
        {
            id: 'meta',
            label: 'Meta',
            icon: FaFacebook,
            count: metaEvents.length,
            color: 'text-gtm-secondary'
        },
        {
            id: 'google-ads',
            label: 'Google Ads',
            icon: FaChartBar,
            count: googleAdsEvents.length,
            color: 'text-gtm-accent'
        },
        {
            id: 'linkedin',
            label: 'LinkedIn',
            icon: FaLinkedin,
            count: linkedinEvents.length,
            color: 'text-gtm-primary'
        },
        {
            id: 'klaviyo',
            label: 'Klaviyo',
            icon: MdEmail,
            count: klaviyoEvents.length,
            color: 'text-gtm-secondary'
        },
        {
            id: 'pinterest',
            label: 'Pinterest',
            icon: FaPinterest,
            count: pinterestEvents.length,
            color: 'text-gtm-accent'
        },
        {
            id: 'microsoft',
            label: 'Microsoft',
            icon: FaMicrosoft,
            count: microsoftEvents.length,
            color: 'text-gtm-primary'
        },
        {
            id: 'other',
            label: 'Other',
            icon: FaCog,
            count: otherTech.length,
            color: 'text-gray-500'
        }
    ];

    const EventCard = ({ event, index }) => (
        <div key={index} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-medium text-lg">{event.name}</h4>
                    <p className="text-sm text-gray-600">{event.type}</p>
                    {event.triggers && event.triggers.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                            Triggers: {event.triggers.length}
                        </p>
                    )}
                </div>
                <span className="px-2 py-1 bg-gtm-primary text-white rounded text-xs">
                    Event
                </span>
            </div>
            {event.details && (
                <div className="mt-2">
                    <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gtm-primary">View Details</summary>
                        <pre className="mt-2 bg-white p-2 rounded border overflow-x-auto">
                            {JSON.stringify(event.details, null, 2)}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    );

    const renderTabContent = () => {
        switch (activeTab) {
            case 'ga4':
                return (
                    <div className="space-y-6">
                        {ga4Events.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <FaGoogle className="text-gtm-primary" />
                                    GA4 Events ({ga4Events.length})
                                </h3>
                                <div className="grid gap-3">
                                    {ga4Events.map((event, index) => (
                                        <EventCard key={index} event={event} index={index} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {ga4Streams.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <FaGoogle className="text-gtm-primary" />
                                    GA4 Streams ({ga4Streams.length})
                                </h3>
                                <div className="grid gap-3">
                                    {ga4Streams.map((stream, index) => (
                                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                                            <h4 className="font-medium text-lg">{stream.id}</h4>
                                            <p className="text-sm text-gray-600">GA4 Stream</p>
                                            <div className="mt-2">
                                                <p className="text-xs text-gray-600">
                                                    Enhanced Measurement: {
                                                        stream.enhancedMeasurement?.map(em => em.name).join(', ') || 'None'
                                                    }
                                                </p>
                                                {stream.linking && (
                                                    <p className="text-xs text-gray-600 mt-1">
                                                        Linking: {stream.linking.map(l => l.name).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {ga4Events.length === 0 && ga4Streams.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No GA4 events or streams detected
                            </div>
                        )}
                    </div>
                );

            case 'meta':
                return (
                    <div className="space-y-6">
                        {metaEvents.length > 0 ? (
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <FaFacebook className="text-gtm-secondary" />
                                    Meta Events ({metaEvents.length})
                                </h3>
                                <div className="grid gap-3">
                                    {metaEvents.map((event, index) => (
                                        <EventCard key={index} event={event} index={index} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No Meta Pixel events detected
                            </div>
                        )}
                    </div>
                );

            case 'google-ads':
                return (
                    <div className="space-y-6">
                        {googleAdsEvents.length > 0 ? (
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <FaChartBar className="text-gtm-accent" />
                                    Google Ads Events ({googleAdsEvents.length})
                                </h3>
                                <div className="grid gap-3">
                                    {googleAdsEvents.map((event, index) => (
                                        <EventCard key={index} event={event} index={index} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No Google Ads conversion events detected
                            </div>
                        )}
                    </div>
                );

            case 'linkedin':
                return (
                    <div className="space-y-6">
                        {linkedinEvents.length > 0 ? (
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <FaLinkedin className="text-gtm-primary" />
                                    LinkedIn Events ({linkedinEvents.length})
                                </h3>
                                <div className="grid gap-3">
                                    {linkedinEvents.map((event, index) => (
                                        <EventCard key={index} event={event} index={index} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No LinkedIn Insight Tag events detected
                            </div>
                        )}
                    </div>
                );

            case 'klaviyo':
                return (
                    <div className="space-y-6">
                        {klaviyoEvents.length > 0 ? (
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <MdEmail className="text-gtm-secondary" />
                                    Klaviyo Events ({klaviyoEvents.length})
                                </h3>
                                <div className="grid gap-3">
                                    {klaviyoEvents.map((event, index) => (
                                        <EventCard key={index} event={event} index={index} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No Klaviyo events detected
                            </div>
                        )}
                    </div>
                );

            case 'pinterest':
                return (
                    <div className="space-y-6">
                        {pinterestEvents.length > 0 ? (
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <FaPinterest className="text-gtm-accent" />
                                    Pinterest Events ({pinterestEvents.length})
                                </h3>
                                <div className="grid gap-3">
                                    {pinterestEvents.map((event, index) => (
                                        <EventCard key={index} event={event} index={index} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No Pinterest Tag events detected
                            </div>
                        )}
                    </div>
                );

            case 'microsoft':
                return (
                    <div className="space-y-6">
                        {microsoftEvents.length > 0 ? (
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <FaMicrosoft className="text-gtm-primary" />
                                    Microsoft Ads Events ({microsoftEvents.length})
                                </h3>
                                <div className="grid gap-3">
                                    {microsoftEvents.map((event, index) => (
                                        <EventCard key={index} event={event} index={index} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No Microsoft Advertising events detected
                            </div>
                        )}
                    </div>
                );

            case 'other':
                return (
                    <div className="space-y-6">
                        {otherTech.length > 0 ? (
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                    <FaCog className="text-gray-500" />
                                    Other Technologies ({otherTech.length})
                                </h3>
                                <div className="grid gap-3">
                                    {otherTech.map((event, index) => (
                                        <EventCard key={index} event={event} index={index} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No other marketing technologies detected
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="glass-morph-dark fixed inset-0 flex items-center justify-center z-50 pt-40">
            <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-[var(--max-width-desktop)] max-h-[90vh] overflow-hidden flex flex-col">
                <div className="sticky top-0 bg-gtm-primary border-b p-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-white">Full Analysis</h2>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white"
                        >
                            <FaTimes size={20} />
                        </button>
                    </div>
                </div>

                <div className="border-b bg-gray-50">
                    <nav className="flex space-x-4 px-6 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 py-4 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                                            ? 'border-gtm-primary text-gtm-primary'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon className={tab.color} />
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className="bg-gtm-accent text-gray-900 px-2 py-1 rounded-full text-xs font-medium">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {renderTabContent()}
                </div>

                {gtmContainers.length > 0 && (
                    <div className="border-t bg-gray-50 p-4">
                        <div className="text-sm text-gray-600">
                            <strong className="text-gtm-primary">GTM Container:</strong> {gtmContainers.map(c => c.id).join(', ')}
                            {gtmContainers.some(c => c.consentMode) && (
                                <span className="ml-2 px-2 py-1 bg-gtm-secondary text-white rounded text-xs font-medium">
                                    Consent Mode Detected
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <div className="border-t bg-gray-50 p-4">
                    <details className="text-sm">
                        <summary className="cursor-pointer font-medium text-gray-600 hover:text-gtm-primary">Raw Analysis Data</summary>
                        <pre className="mt-2 bg-white p-4 rounded border overflow-x-auto text-xs max-h-48">
                            {JSON.stringify(analysisData, null, 2)}
                        </pre>
                    </details>
                </div>
            </div>
        </div>
    );
}