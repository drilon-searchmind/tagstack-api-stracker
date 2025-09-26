"use client";

import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { FaFileAlt, FaChartLine } from "react-icons/fa";
import FullAnalysisModal from "./FullAnalysisModal";
import SummaryModal from "./SummaryModal";

export default function GtmAnalysis({ scanResults }) {
    const [selectedAnalysis, setSelectedAnalysis] = React.useState(null);
    const [selectedSummary, setSelectedSummary] = React.useState(null);

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

    // Use the same parsing logic as SummaryModal
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

    return (
        <div className="space-y-4">
            <Accordion type="single" collapsible>
                {scanResults.containerScans.map((cscan) => {
                    // Debug: Log the structure to understand the data
                    console.log('Container scan data:', cscan);

                    // Extract ID safely
                    const id = cscan?.id || "unknown";

                    // Try multiple paths to access the data
                    const body = cscan?.body || {};
                    const payload = body?.payload || {};

                    // Extract status information
                    const ok = cscan?.ok ?? body?.ok ?? payload?.ok ?? true;
                    const status = cscan?.status ?? body?.status ?? payload?.status;

                    // Use the same parsing logic as SummaryModal!
                    const messageData = parseMessageData(body);

                    // Extract GTM container data from the parsed message
                    let tags = [];
                    let variables = [];
                    let triggers = [];
                    let cmpName = null;
                    let hasConsentMode = false;
                    let isServerSide = false;

                    if (messageData) {
                        // Look for GTM Container in the message data
                        Object.keys(messageData).forEach(key => {
                            const containerData = messageData[key];

                            if (containerData?.entityType === 'GTM Container') {
                                tags = containerData.tags || [];
                                variables = containerData.variables || [];
                                triggers = containerData.triggers || [];
                                cmpName = containerData.cmpName || null;
                                hasConsentMode = containerData.hasConsentMode || false;
                                isServerSide = containerData.isServerSide || false;
                            }
                        });
                    }

                    // Debug: Log extracted data
                    console.log('Extracted data for container', id, {
                        tags: tags.length,
                        variables: variables.length,
                        triggers: triggers.length,
                        messageData: messageData
                    });

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
                                        <div className="text-lg font-semibold truncate">{id}</div>
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

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                            <div className="bg-gray-50 p-3 rounded">
                                                <div className="text-xs text-gray-500">Raw success</div>
                                                <div className="mt-1 text-sm">{String(payload?.success ?? false)}</div>
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded">
                                                <div className="text-xs text-gray-500">Server container URL</div>
                                                <div className="mt-1 text-sm">{"—"}</div>
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded">
                                                <div className="text-xs text-gray-500">CMP / Consent details</div>
                                                <div className="mt-1 text-sm">{cmpName || (hasConsentMode ? "Consent-mode detected" : "—")}</div>
                                            </div>

                                            <button
                                                className="bg-gtm-gradient-start text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2 justify-center"
                                                onClick={() => openModal(id)}
                                            >
                                                <FaChartLine className="w-4 h-4" />
                                                View Full Analysis
                                            </button>

                                            <button
                                                className="bg-gray-200 cursor-pointer text-black underline px-4 py-2 rounded-md hover:bg-gray-300 flex items-center gap-2 justify-center"
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

                                                <AccordionItem value="variables">
                                                    <AccordionTrigger className="text-sm font-medium">
                                                        Variables ({countSafe(variables)})
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
                                                                    {Array.isArray(variables) && variables.length > 0 ? (
                                                                        variables.map((v, i) => (
                                                                            <tr key={i} className="border-b hover:bg-gray-50">
                                                                                <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                                                                                <td className="px-3 py-2">
                                                                                    <div className="font-medium">{v.name || "(unnamed)"}</div>
                                                                                    <div className="text-xs text-gray-500">{v.type}</div>
                                                                                </td>
                                                                                <td className="px-3 py-2 text-xs">
                                                                                    {v.parameters?.length ? `${v.parameters.length} params` : "No params"}
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        <tr>
                                                                            <td colSpan={3} className="px-3 py-4 text-xs text-gray-500">No variables detected</td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>

                                                <AccordionItem value="triggers">
                                                    <AccordionTrigger className="text-sm font-medium">
                                                        Triggers ({countSafe(triggers)})
                                                    </AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="overflow-auto rounded border">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="bg-slate-100">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left">#</th>
                                                                        <th className="px-3 py-2 text-left">Type / Name</th>
                                                                        <th className="px-3 py-2 text-left">Details</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {Array.isArray(triggers) && triggers.length > 0 ? (
                                                                        triggers.map((tr, i) => (
                                                                            <tr key={i} className="border-b hover:bg-gray-50">
                                                                                <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                                                                                <td className="px-3 py-2">
                                                                                    <div className="font-medium">{tr.name || "(unnamed)"}</div>
                                                                                    <div className="text-xs text-gray-500">{tr.type}</div>
                                                                                </td>
                                                                                <td className="px-3 py-2 text-xs">
                                                                                    {tr.parameters?.length ? `${tr.parameters.length} params` : "No params"}
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        <tr>
                                                                            <td colSpan={3} className="px-3 py-4 text-xs text-gray-500">No triggers detected</td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
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