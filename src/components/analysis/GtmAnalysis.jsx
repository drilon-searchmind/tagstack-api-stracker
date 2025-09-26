"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion";
import FullAnalysisModal from "@/components/analysis/FullAnalysisModal";
import { FaChartLine, FaFileAlt } from "react-icons/fa";

/**
 * GtmAnalysis
 * Props:
 *  - scanResults: object produced by ScanUrlForm (contains containerScans array)
 *
 * Uses shadcn accordion: summary in the trigger, details inside content (closed by default).
 */
export default function GtmAnalysis({ scanResults }) {
    const [selectedAnalysis, setSelectedAnalysis] = React.useState(null);

    if (!scanResults || !Array.isArray(scanResults.containerScans)) return null;

    const openModal = (id) => {
        const analysis = scanResults.containerScans.find((c) => c.id === id);
        setSelectedAnalysis(analysis);
    };
    const closeModal = () => setSelectedAnalysis(null);

    const safeParseMessage = (msg) => {
        if (!msg) return null;
        if (typeof msg === "object") return msg;
        if (typeof msg === "string") {
            try {
                return JSON.parse(msg);
            } catch {
                return null;
            }
        }
        return null;
    };

    const countSafe = (v) =>
        Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : 0;

    const normalizeTechList = (payload, tagData) => {
        const tech = payload?.techList || tagData?.techList || payload?.body?.techList || [];
        if (!Array.isArray(tech)) return [];
        return tech.map((t) => (typeof t === "string" ? t : t?.name || t?.title || JSON.stringify(t)));
    };

    return (
        <div className="space-y-4">
            <Accordion type="single" collapsible>
                {scanResults.containerScans.map((cscan) => {
                    const id = cscan?.id || "unknown";
                    const ok = cscan?.ok;
                    const status = cscan?.status;
                    const payload = cscan?.body ?? {};

                    let parsedMessage = safeParseMessage(payload?.message);
                    let tagData = payload?.data ?? payload;
                    if (parsedMessage) {
                        if (parsedMessage[id]) tagData = parsedMessage[id];
                        else if (parsedMessage?.vitals || parsedMessage?.techList) tagData = parsedMessage;
                    }

                    const isServerSide =
                        !!tagData?.server_container_url ||
                        /server_container|server_container_url|server-side|server_container/i.test(
                            JSON.stringify(tagData || "")
                        );

                    const hasConsentMode =
                        tagData?.consentMode === true ||
                        tagData?.consent_mode === true ||
                        /consentMode|consent_mode|consentModeEnabled|consentMode/i.test(JSON.stringify(tagData || ""));

                    const techNames = normalizeTechList(payload, tagData).join(" ").toLowerCase();
                    const knownCmps = ["cookiebot", "cookieinformation", "cookieconsent", "onetrust", "cookielaw", "klaro"];
                    const cmpDetected = knownCmps.find((k) => techNames.includes(k)) || tagData?.cmp || tagData?.cookie_manager || null;
                    const cmpName = typeof cmpDetected === "string" ? cmpDetected : cmpDetected ? String(cmpDetected) : null;

                    const variables = tagData?.variables || tagData?.vars || [];
                    const tags = tagData?.tags || [];
                    const triggers = tagData?.triggers || [];

                    const techList = normalizeTechList(payload, tagData);

                    return (
                        <AccordionItem key={id} value={id} className="mt-5">
                            <AccordionTrigger className="bg-gtm-gradient p-5 rounder-lg text-white">
                                <div className="flex items-center justify-between w-full gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm text-gray-200">Container</div>
                                        <div className="text-lg font-semibold truncate">{id}</div>
                                        <div className="text-xs text-gray-100 truncate mt-1">{payload?.url ?? tagData?.url ?? ""}</div>
                                    </div>

                                    <div className="flex items-center gap-3 glass-morph p-5 min-w-[400px] max-w-[400px] overflow-hidden">
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
                                    <CardContent>

                                        {/* Summary row (mobile-friendly) */}
                                        <div className="flex items-center justify-between gap-4 mb-4 md:hidden">
                                            <div className="text-xs text-gray-500">{isServerSide ? "Server-side container" : "Client-side container"}</div>
                                            <div className="text-xs text-gray-500">{hasConsentMode ? "Consent mode: yes" : "Consent mode: no"}</div>
                                            <div className="text-xs text-gray-500">{cmpName || "No CMP detected"}</div>
                                        </div>

                                        {/* Detailed info */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                            <div className="bg-gray-50 p-3 rounded">
                                                <div className="text-xs text-gray-500">Raw success</div>
                                                <div className="mt-1 text-sm">{String(tagData?.success ?? payload?.success ?? false)}</div>
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded">
                                                <div className="text-xs text-gray-500">Server container URL</div>
                                                <div className="mt-1 text-sm">{tagData?.server_container_url || "—"}</div>
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded">
                                                <div className="text-xs text-gray-500">CMP / Consent details</div>
                                                <div className="mt-1 text-sm">{cmpName || (hasConsentMode ? "Consent-mode detected" : "—")}</div>
                                            </div>

                                            <button
                                                className="bg-gtm-gradient-end cursor-pointer text-black underline px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2 justify-center "
                                                onClick={() => openModal(id)}
                                            >
                                                <FaFileAlt className="w-4 h-4" />
                                                View Full Analysis
                                            </button>
                                        </div>

                                        {/* Tables as Accordions */}
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
                                                                    {Array.isArray(tags) && tags.length ? (
                                                                        tags.map((t, i) => {
                                                                            const name = t?.name || t?.tag || t?.type || String(t);
                                                                            const type = t?.type || (t?.function ? "function" : "unknown");
                                                                            const details = t?.parameters ? JSON.stringify(t.parameters).slice(0, 300) : t?.vtp_html ? "<html/>" : JSON.stringify(t).slice(0, 300);
                                                                            return (
                                                                                <tr key={i} className="odd:bg-white even:bg-slate-50">
                                                                                    <td className="px-3 py-2 align-top">{i + 1}</td>
                                                                                    <td className="px-3 py-2 align-top">
                                                                                        <div className="font-medium">{name}</div>
                                                                                        <div className="text-xs text-gray-500">{type}</div>
                                                                                    </td>
                                                                                    <td className="px-3 py-2 align-top">
                                                                                        <div className="text-xs text-gray-700 whitespace-pre-wrap">{details}</div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <tr>
                                                                            <td colSpan={3} className="px-3 py-4 text-xs text-gray-500">No tags detected</td>
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
                                                                    {Array.isArray(variables) && variables.length ? (
                                                                        variables.map((v, i) => {
                                                                            const name = v?.name || v?.vtp_name || v?.variableName || `var-${i + 1}`;
                                                                            const type = v?.type || v?.vtp_javascript ? "js" : v?.type || "unknown";
                                                                            const details = v?.parameters ? JSON.stringify(v.parameters).slice(0, 300) : JSON.stringify(v).slice(0, 300);
                                                                            return (
                                                                                <tr key={i} className="odd:bg-white even:bg-slate-50">
                                                                                    <td className="px-3 py-2 align-top">{i + 1}</td>
                                                                                    <td className="px-3 py-2 align-top">
                                                                                        <div className="font-medium">{name}</div>
                                                                                        <div className="text-xs text-gray-500">{type}</div>
                                                                                    </td>
                                                                                    <td className="px-3 py-2 align-top">
                                                                                        <div className="text-xs text-gray-700 whitespace-pre-wrap">{details}</div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })
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
                                                                    {Array.isArray(triggers) && triggers.length ? (
                                                                        triggers.map((tr, i) => {
                                                                            const name = tr?.name || tr?.type || `trigger-${i + 1}`;
                                                                            const type = tr?.type || "unknown";
                                                                            const details = tr?.parameters ? JSON.stringify(tr.parameters).slice(0, 300) : JSON.stringify(tr).slice(0, 300);
                                                                            return (
                                                                                <tr key={i} className="odd:bg-white even:bg-slate-50">
                                                                                    <td className="px-3 py-2 align-top">{i + 1}</td>
                                                                                    <td className="px-3 py-2 align-top">
                                                                                        <div className="font-medium">{name}</div>
                                                                                        <div className="text-xs text-gray-500">{type}</div>
                                                                                    </td>
                                                                                    <td className="px-3 py-2 align-top">
                                                                                        <div className="text-xs text-gray-700 whitespace-pre-wrap">{details}</div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })
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

                                        {/* Martech */}
                                        <div className="mt-6">
                                            <h4 className="text-sm font-medium mb-2">Martech summary</h4>
                                            {techList.length ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {techList.map((t, i) => (
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
        </div>
    );
}