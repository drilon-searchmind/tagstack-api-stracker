"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * GtmAnalysis
 * Props:
 *  - scanResults: object produced by ScanUrlForm (contains containerScans array)
 *
 * This component tries to present a compact analysis similar to TagStack's UI.
 */
export default function GtmAnalysis({ scanResults }) {
    if (!scanResults || !Array.isArray(scanResults.containerScans)) return null;

    const renderTechList = (payload) => {
        const tech = payload?.techList || payload?.body?.techList || [];
        if (!Array.isArray(tech) || tech.length === 0) return <em>No detected technologies</em>;
        return (
            <div className="flex flex-wrap gap-2">
                {tech.slice(0, 40).map((t, i) => {
                    const name = typeof t === "string" ? t : t?.name || t?.title || JSON.stringify(t);
                    return (
                        <span
                            key={i}
                            className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800 border"
                        >
                            {name}
                        </span>
                    );
                })}
            </div>
        );
    };

    const extractSimple = (payload, key) => {
        if (!payload) return undefined;
        return payload[key] ?? payload?.body?.[key] ?? payload?.message?.[key];
    };

    return (
        <div className="space-y-4">
            {scanResults.containerScans.map((cscan) => {
                const id = cscan?.id || "unknown";
                const ok = cscan?.ok;
                const status = cscan?.status;
                const payload = cscan?.body ?? {};
                // TagStack often returns its scan data directly, or under body.message / body.data etc.
                const tagData = payload?.data || payload || payload?.message || {};
                const success = !!(payload && (payload.success === true || tagData.success === true));
                const reportedUrl = payload?.url || tagData?.url || extractSimple(payload, "url") || id;
                const score = payload?.score ?? tagData?.score ?? null;

                // attempt to detect consent / GA4 presence
                const techNames = (payload?.techList || tagData?.techList || []).map(t => (t && t.name) || t).join(" ");
                const hasConsentMode = /consent|consent mode|consent_mode/i.test(JSON.stringify(payload)) || /consent/i.test(techNames);
                const hasGA4 = /G-/.test(reportedUrl) || /ga4|google analytics|gtag/i.test(techNames + JSON.stringify(payload));

                return (
                    <Card key={id} className="border my-1">
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-muted-foreground">Container</div>
                                    <div className="text-lg font-semibold">{id}</div>
                                    <div className="text-xs text-gray-500">{reportedUrl}</div>
                                </div>
                                <div className="text-right">
                                    <div className={`px-2 py-1 rounded text-sm ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                        {ok ? "TagStack OK" : `Scan ${status || "error"}`}
                                    </div>
                                    {typeof score === "number" && (
                                        <div className="mt-2 text-xs text-gray-600">Score: {score}</div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <div className="text-xs font-medium text-gray-600 mb-1">Overview</div>
                                    <ul className="text-sm space-y-1">
                                        <li>Success: <strong>{success ? "Yes" : "No"}</strong></li>
                                        <li>Has Consent Mode: <strong>{hasConsentMode ? "Likely" : "Unknown"}</strong></li>
                                        <li>GA4 present: <strong>{hasGA4 ? "Yes" : "No"}</strong></li>
                                    </ul>
                                </div>

                                <div className="md:col-span-2">
                                    <div className="text-xs font-medium text-gray-600 mb-1">Detected technologies</div>
                                    {renderTechList(payload || tagData)}
                                </div>
                            </div>

                            {payload?.vitals && (
                                <div className="mt-4">
                                    <div className="text-xs font-medium text-gray-600 mb-1">Vitals</div>
                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(payload.vitals, null, 2)}</pre>
                                </div>
                            )}

                            {payload?.message && (
                                <div className="mt-4">
                                    <div className="text-xs font-medium text-gray-600 mb-1">Notes</div>
                                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{typeof payload.message === "string" ? payload.message : JSON.stringify(payload.message, null, 2)}</pre>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}