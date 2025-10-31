"use client";

import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { FaFileAlt, FaChartLine, FaCopy, FaGoogle, FaFacebook, FaChartBar, FaCog, FaLinkedin, FaPinterest, FaMicrosoft, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import { SiKlaviyo } from "react-icons/si";
import { findServerContainerUrl, extractGtmContainerData } from "@/utils/gtmHelpers";

export default function GtmAnalysis({ scanResults }) {
    const [copiedId, setCopiedId] = React.useState(null);
    const [activeAnalysisTab, setActiveAnalysisTab] = React.useState({});

    if (!scanResults || !Array.isArray(scanResults.containerScans)) {
        return <div>No scan results available</div>;
    }

    const countSafe = (arr) => Array.isArray(arr) ? arr.length : 0;

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

    const copyToClipboard = async (containerId) => {
        try {
            await navigator.clipboard.writeText(containerId);
            setCopiedId(containerId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

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

    // Summary stats function
    const getSummaryStats = (messageData) => {
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

    // Event card component
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

    return (
        <div className="space-y-4" id="gtmAnalysisResults">
            <Accordion type="single" collapsible defaultValue={scanResults.containerScans[0]?.id || "unknown"}>
                {scanResults.containerScans.map((cscan) => {
                    const id = cscan?.id || "unknown";
                    const body = cscan?.body || {};
                    const payload = body?.payload || {};
                    const ok = cscan?.ok ?? body?.ok ?? payload?.ok ?? true;
                    const status = cscan?.status ?? body?.status ?? payload?.status;
                    const messageData = parseMessageData(body);
                    const containerData = extractGtmContainerData(messageData);
                    const {
                        tags,
                        variables,
                        triggers,
                        cmpName,
                        hasConsentMode,
                        isServerSide,
                        serverContainerUrl
                    } = containerData;

                    // Extract analysis data
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

                    // Summary stats
                    const summaryStats = getSummaryStats(messageData);

                    const techList = [];
                    if (Array.isArray(tags)) {
                        tags.forEach(tag => {
                            if (tag.type === 'gaawe') techList.push('GA4');
                            if (tag.type === 'awct') techList.push('Google Ads');
                            if (tag.name?.toLowerCase().includes('facebook') || tag.name?.toLowerCase().includes('meta')) {
                                techList.push('Meta Pixel');
                            }
                        });
                    }
                    const uniqueTechList = [...new Set(techList)];

                    return (
                        <AccordionItem key={id} value={id} className="mt-5">
                            <AccordionTrigger className="bg-gtm-gradient-start p-5 rounded-lg text-white">
                                <div className="flex items-center justify-between w-full gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-gray-200">Container</div>
                                        <div 
                                            className="text-lg font-semibold truncate flex items-center gap-2 cursor-pointer hover:text-blue-200 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyToClipboard(id);
                                            }}
                                            title="Click to copy container ID"
                                        >
                                            {id}
                                            <FaCopy 
                                                className={`w-4 h-4 transition-colors ${copiedId === id ? 'text-green-300' : 'text-gray-100 hover:text-white'}`} 
                                            />
                                            {copiedId === id && (
                                                <span className="text-xs text-green-300 ml-1">Copied!</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-100 truncate mt-1">{payload?.url ?? ""}</div>
                                    </div>

                                    <div className="flex items-center gap-3 bg-gray-100 rounded-md p-5 min-w-[400px] max-w-[400px] overflow-hidden shadow-lg">
                                        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${ok ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                                            {ok ? "OK" : `Err ${status ?? ""}`}
                                        </div>

                                        <div className="text-xs text-gray-500 text-right">
                                            <div>{isServerSide ? "Server-side" : "Client-side"}</div>
                                            <div className="mt-1">{hasConsentMode ? "Consent mode" : "No consent"}</div>
                                        </div>

                                        <div className="hidden md:block ml-4 text-xs text-gray-600">
                                            <div>{cmpName || "No CMP"}</div>
                                            <div className="mt-1">
                                                {countSafe(variables)} vars · {countSafe(tags)} tags · {countSafe(triggers)} trg
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </AccordionTrigger>

                            <AccordionContent>
                                <Card className="border">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between gap-4 mb-4 md:hidden">
                                            <div className="text-xs text-gray-500">{isServerSide ? "Server-side container" : "Client-side container"}</div>
                                            <div className="text-xs text-gray-500">{hasConsentMode ? "Consent mode: yes" : "Consent mode: no"}</div>
                                            <div className="text-xs text-gray-500">{cmpName || "No CMP detected"}</div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                                            <div className="bg-gray-50 p-3 rounded col-span-6">
                                                <div className="text-xs text-gray-500">Server container URL</div>
                                                <div className="mt-1 text-sm">
                                                    {serverContainerUrl ? (
                                                        <div className="flex items-start gap-1">
                                                            <span className="text-green-600 truncate max-w-[90%]" title={serverContainerUrl}>
                                                                Server Container URL Detected
                                                            </span>
                                                            <svg
                                                                className="w-4 h-4 text-green-600"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500">—</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded col-span-6">
                                                <div className="text-xs text-gray-500">CMP / Consent details</div>
                                                <div className="mt-1 text-sm">
                                                    {hasConsentMode ? (
                                                        <div className="flex items-start gap-1">
                                                            <span className="text-green-600 truncate max-w-[90%]">
                                                                Consent Mode Detected
                                                            </span>
                                                            <svg
                                                                className="w-4 h-4 text-green-600"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 20 20"
                                                                fill="currentColor"
                                                            >
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500">No consent mode detected</span>
                                                    )}
                                                    {cmpName && (
                                                        <div className="text-sm text-blue-600 mt-1">
                                                            CMP: {cmpName}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Analysis and Summary Accordions */}
                                        <div className="mb-6">
                                            <Accordion type="single" collapsible>
                                                <AccordionItem value="summary">
                                                    <AccordionTrigger className="text-sm font-medium bg-gray-50 px-4 py-2 rounded-t-lg">
                                                        <div className="flex items-center gap-2">
                                                            <FaFileAlt className="w-4 h-4" />
                                                            Container Summary
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="border border-t-0 rounded-b-lg p-4">
                                                        {summaryStats ? (
                                                            <div className="space-y-6">
                                                                {/* Overview Stats */}
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                                                                        <div className="text-2xl font-bold text-gtm-primary">
                                                                            {summaryStats.ga4Events + summaryStats.metaEvents + summaryStats.googleAdsEvents + 
                                                                             summaryStats.linkedinEvents + summaryStats.klaviyoEvents + summaryStats.pinterestEvents + 
                                                                             summaryStats.microsoftEvents + summaryStats.otherTech}
                                                                        </div>
                                                                        <div className="text-sm text-gray-600">Total Events</div>
                                                                    </div>
                                                                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                                                                        <div className="text-2xl font-bold text-gtm-secondary">{summaryStats.totalTags}</div>
                                                                        <div className="text-sm text-gray-600">Tags</div>
                                                                    </div>
                                                                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                                                                        <div className="text-2xl font-bold text-gtm-accent">{summaryStats.totalTriggers}</div>
                                                                        <div className="text-sm text-gray-600">Triggers</div>
                                                                    </div>
                                                                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                                                                        <div className="text-2xl font-bold text-gtm-primary">{summaryStats.totalVariables}</div>
                                                                        <div className="text-sm text-gray-600">Variables</div>
                                                                    </div>
                                                                </div>

                                                                {/* Configuration Status */}
                                                                <div>
                                                                    <h3 className="text-lg font-semibold mb-4">Configuration Status</h3>
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                                            {summaryStats.hasConsentMode ? (
                                                                                <FaCheckCircle className="text-gtm-secondary" />
                                                                            ) : (
                                                                                <FaExclamationTriangle className="text-orange-500" />
                                                                            )}
                                                                            <span>Consent Mode: {summaryStats.hasConsentMode ? 'Enabled' : 'Disabled'}</span>
                                                                        </div>

                                                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                                            <FaCheckCircle className={summaryStats.isServerSide ? 'text-gtm-secondary' : 'text-gtm-primary'} />
                                                                            <span>Container Type: {summaryStats.isServerSide ? 'Server-side' : 'Client-side'}</span>
                                                                        </div>

                                                                        {summaryStats.cmpName && (
                                                                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                                                <FaCheckCircle className="text-gtm-secondary" />
                                                                                <span>CMP: {summaryStats.cmpName}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500">No summary data available.</p>
                                                        )}
                                                    </AccordionContent>
                                                </AccordionItem>

                                                <AccordionItem value="analysis">
                                                    <AccordionTrigger className="text-sm font-medium bg-gray-50 px-4 py-2 rounded-t-lg">
                                                        <div className="flex items-center gap-2">
                                                            <FaChartLine className="w-4 h-4" />
                                                            Full Analysis
                                                        </div>
                                                    </AccordionTrigger>
                                                    <AccordionContent className="border border-t-0 rounded-b-lg p-4">
                                                        <div className="space-y-6">
                                                            {/* Analysis Tabs */}
                                                            <div className="border-b">
                                                                <nav className="flex space-x-4 overflow-x-auto">
                                                                    {[
                                                                        { id: 'ga4', label: 'GA4', icon: FaGoogle, count: ga4Events.length + ga4Streams.length, color: 'text-gtm-primary' },
                                                                        { id: 'meta', label: 'Meta', icon: FaFacebook, count: metaEvents.length, color: 'text-gtm-secondary' },
                                                                        { id: 'google-ads', label: 'Google Ads', icon: FaChartBar, count: googleAdsEvents.length, color: 'text-gtm-accent' },
                                                                        { id: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, count: linkedinEvents.length, color: 'text-gtm-primary' },
                                                                        { id: 'klaviyo', label: 'Klaviyo', icon: MdEmail, count: klaviyoEvents.length, color: 'text-gtm-secondary' },
                                                                        { id: 'pinterest', label: 'Pinterest', icon: FaPinterest, count: pinterestEvents.length, color: 'text-gtm-accent' },
                                                                        { id: 'microsoft', label: 'Microsoft', icon: FaMicrosoft, count: microsoftEvents.length, color: 'text-gtm-primary' },
                                                                        { id: 'other', label: 'Other', icon: FaCog, count: otherTech.length, color: 'text-gray-500' }
                                                                    ].map((tab) => {
                                                                        const Icon = tab.icon;
                                                                        const tabKey = `${id}-${tab.id}`;
                                                                        const isActive = activeAnalysisTab[id] === tab.id || (!activeAnalysisTab[id] && tab.id === 'ga4');
                                                                        return (
                                                                            <button
                                                                                key={tab.id}
                                                                                onClick={() => setActiveAnalysisTab(prev => ({ ...prev, [id]: tab.id }))}
                                                                                className={`flex items-center gap-2 py-4 px-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${isActive
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

                                                            {/* Tab Content */}
                                                            <div className="min-h-[200px]">
                                                                {(() => {
                                                                    const activeTab = activeAnalysisTab[id] || 'ga4';
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
                                                                })()}
                                                            </div>

                                                            {/* Raw Data Section */}
                                                            <div className="border-t pt-4">
                                                                <details className="text-sm">
                                                                    <summary className="cursor-pointer font-medium text-gray-600 hover:text-gtm-primary">Raw Analysis Data</summary>
                                                                    <pre className="mt-2 bg-white p-4 rounded border overflow-x-auto text-xs max-h-48">
                                                                        {JSON.stringify(body, null, 2)}
                                                                    </pre>
                                                                </details>
                                                            </div>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </div>

                                        <div className="space-y-4">
                                            <Accordion type="single" collapsible>
                                                <AccordionItem value="tags">
                                                    <AccordionTrigger className="text-sm font-medium">
                                                        Tags ({countSafe(tags)})
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="overflow-auto rounded border">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="bg-slate-100">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left">#</th>
                                                                        <th className="px-3 py-2 text-left">Name / Type</th>
                                                                        <th className="px-3 py-2 text-left">Details</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {Array.isArray(tags) && tags.length > 0 ? (
                                                                        tags.map((t, i) => (
                                                                            <tr key={i} className="border-b hover:bg-gray-50">
                                                                                <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                                                                                <td className="px-3 py-2">
                                                                                    <div className="font-medium">{t.name || "(unnamed)"}</div>
                                                                                    <div className="text-xs text-gray-500">{t.type}</div>
                                                                                </td>
                                                                                <td className="px-3 py-2 text-xs">
                                                                                    {t.parameters?.length ? `${t.parameters.length} params` : "No params"}
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        <tr>
                                                                            <td colSpan={3} className="px-3 py-4 text-xs text-gray-500">
                                                                                No tags detected
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>

                                                {/* Variables and Triggers sections remain unchanged */}
                                                {/* ... */}
                                            </Accordion>
                                        </div>

                                        <div className="mt-6">
                                            <h4 className="text-sm font-medium mb-2">Martech summary</h4>
                                            {uniqueTechList.length ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {uniqueTechList.map((t, i) => (
                                                        <span key={i} className="px-3 py-1 rounded-full bg-slate-100 text-sm text-slate-800 border">
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-500">No technologies detected</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}