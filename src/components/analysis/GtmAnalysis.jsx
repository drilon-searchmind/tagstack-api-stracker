"use client";

import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { FaFileAlt, FaChartLine, FaCopy } from "react-icons/fa";
import FullAnalysisModal from "./FullAnalysisModal";
import SummaryModal from "./SummaryModal";
import { findServerContainerUrl, extractGtmContainerData } from "@/utils/gtmHelpers";

export default function GtmAnalysis({ scanResults }) {
    const [selectedAnalysis, setSelectedAnalysis] = React.useState(null);
    const [selectedSummary, setSelectedSummary] = React.useState(null);
    const [copiedId, setCopiedId] = React.useState(null);

    if (!scanResults || !Array.isArray(scanResults.containerScans)) {
        return <div>No scan results available</div>;
    }

    const openModal = (id) => {
        const analysis = scanResults.containerScans.find(scan => scan.id === id);
        setSelectedAnalysis(analysis);
    };

    const closeModal = () => {
        setSelectedAnalysis(null);
    };

    const openSummaryModal = (id) => {
        const analysis = scanResults.containerScans.find(scan => scan.id === id);
        setSelectedSummary(analysis);
    };

    const closeSummaryModal = () => {
        setSelectedSummary(null);
    };

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
            setTimeout(() => setCopiedId(null), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };

    return (
        <div className="space-y-4">
            <Accordion type="single" collapsible>
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

                    console.log({ hasConsentMode })

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

                                            <button
                                                className="bg-gtm-gradient-start text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2 justify-center col-span-3"
                                                onClick={() => openModal(id)}
                                            >
                                                <FaChartLine className="w-4 h-4" />
                                                View Full Analysis
                                            </button>

                                            <button
                                                className="bg-gray-200 cursor-pointer text-black underline px-4 py-2 rounded-md hover:bg-gray-300 flex items-center gap-2 justify-center col-span-3"
                                                onClick={() => openSummaryModal(id)}
                                            >
                                                <FaFileAlt className="w-4 h-4" />
                                                View Summary
                                            </button>
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

            <FullAnalysisModal
                isOpen={!!selectedAnalysis}
                onClose={closeModal}
                analysisData={selectedAnalysis?.body}
            />

            <SummaryModal
                isOpen={!!selectedSummary}
                onClose={closeSummaryModal}
                analysisData={selectedSummary?.body}
                containerId={selectedSummary?.id}
            />
        </div>
    );
}