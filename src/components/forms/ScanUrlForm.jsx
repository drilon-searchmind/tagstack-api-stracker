"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import GtmAnalysis from "@/components/analysis/GtmAnalysis";
import ScanningOverlay from "@/components/ui/ScanningOverlay";
import FullAnalysisModal from "@/components/analysis/FullAnalysisModal";
import SummaryModal from "@/components/analysis/SummaryModal";
import AuthRequired from "@/components/ui/AuthRequired";
import { FaSearch } from "react-icons/fa";

function ScanUrlFormContent() {
    const { data: session, status } = useSession();
    const searchParams = useSearchParams();
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [scanResults, setScanResults] = useState(null);
    const [error, setError] = useState(null);
    const [gtmContainers, setGtmContainers] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [customerId, setCustomerId] = useState(null);
    const [scanStartTime, setScanStartTime] = useState(null);

    useEffect(() => {
        const customerUrl = searchParams.get('customer-url');
        const customerIdParam = searchParams.get('customer-id');
        
        if (customerUrl) {
            setUrl(decodeURIComponent(customerUrl));
        }
        
        if (customerIdParam) {
            setCustomerId(customerIdParam);
        }
        
        if (customerUrl && customerIdParam && session) {
            setTimeout(() => {
                handleSubmit(null, decodeURIComponent(customerUrl), customerIdParam);
            }, 500);
        }
    }, [searchParams, session]);

    const saveScanToDatabase = async (scanData, customerId, duration) => {
        if (!customerId || !session) return;

        console.log('=== DEBUG: Scan data being sent to API ===');
        console.log('customerId:', customerId);
        console.log('requestedUrl:', scanData.requestedUrl);
        console.log('gtmScan:', scanData.gtmScan);
        console.log('containers:', scanData.containers);
        console.log('containers type:', typeof scanData.containers);
        console.log('containers JSON:', JSON.stringify(scanData.containers, null, 2));
        console.log('containerScans:', scanData.containerScans);
        console.log('containerScans type:', typeof scanData.containerScans);
        console.log('containerScans JSON:', JSON.stringify(scanData.containerScans, null, 2));
        console.log('scanDuration:', duration);
        console.log('=== END DEBUG ===');

        try {
            const response = await fetch('/api/scanned-url', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customerId,
                    requestedUrl: scanData.requestedUrl,
                    gtmScan: scanData.gtmScan,
                    containers: scanData.containers,
                    containerScans: scanData.containerScans,
                    scanDuration: duration
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to save scan:', errorData.error);
            } else {
                console.log('Scan saved successfully');
            }
        } catch (error) {
            console.error('Error saving scan:', error);
        }
    };

    const handleSubmit = async (e, urlOverride = null, customerIdOverride = null) => {
        if (e) e.preventDefault();
        
        const scanUrl = urlOverride || url;
        const scanCustomerId = customerIdOverride || customerId;
        
        if (!scanUrl || !session) return;

        setIsLoading(true);
        setError(null);
        setScanResults(null);
        setGtmContainers([]);
        setShowResults(false);
        const startTime = Date.now(); // Fix: Move this to the correct location

        try {
            const respGtm = await fetch(`/api/gtm-scan-id?url=${encodeURIComponent(scanUrl)}`);
            const gtmJson = await respGtm.json();
            if (!respGtm.ok) throw new Error(gtmJson.message || gtmJson.error || JSON.stringify(gtmJson));

            const containers = Array.isArray(gtmJson.containers)
                ? gtmJson.containers.filter(c => c && typeof c.id === 'string' && /^GTM-[A-Z0-9]+$/.test(c.id))
                : [];

            setGtmContainers(containers);

            const scans = await Promise.allSettled(
                containers.map(ct => fetch(`/api/scan?url=${encodeURIComponent(ct.id)}`))
            );

            const containerScans = await Promise.all(
                scans.map(async (s, idx) => {
                    const id = containers[idx]?.id || null;
                    if (s.status === "fulfilled") {
                        try {
                            const res = s.value;
                            const body = await res.json().catch(() => null);
                            return { id, ok: res.ok, status: res.status, body };
                        } catch (err) {
                            return { id, ok: false, error: String(err) };
                        }
                    } else {
                        return { id, ok: false, error: String(s.reason) };
                    }
                })
            );

            const scanDuration = Date.now() - startTime; // Fix: Use the correct start time
            const finalScanResults = {
                requestedUrl: scanUrl,
                gtmScan: gtmJson,
                containers,
                containerScans
            };

            setScanResults(finalScanResults);

            if (scanCustomerId) {
                await saveScanToDatabase(finalScanResults, scanCustomerId, scanDuration);
            }

        } catch (err) {
            console.error("Error scanning URL:", err);
            setError(err.message || String(err));
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (scanResults && !isLoading) {
            setTimeout(() => setShowResults(true), 100); // Small delay for smooth transition
        }
    }, [scanResults, isLoading]);

    if (status === "loading") {
        return (
            <div className="w-full">
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-600">Loading...</span>
                </div>
            </div>
        );
    }

    if (!session) {
        return <AuthRequired />;
    }

    return (
        <div className="w-full relative">
            <ScanningOverlay isVisible={isLoading} />

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-3">
                    <Input
                        type="text"
                        placeholder="Enter URL (e.g. example.com)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                        className="flex-1 h-14 text-lg px-6 bg-white/90 backdrop-blur border-white/30 focus:bg-white focus:border-white shadow-lg"
                    />
                    <Button 
                        className="bg-white text-gray-900 hover:bg-gray-100 h-14 text-lg font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105" 
                        type="submit" 
                        disabled={isLoading || !url}
                    >
                        <FaSearch className="mr-2" />
                        Scan URL
                    </Button>
                </div>
            </form>

            {error && (
                <div className="mt-6 glass-morph border border-red-300/50">
                    <div className="p-6 text-red-100 bg-red-500/20 rounded-lg">
                        {error}
                    </div>
                </div>
            )}

            {scanResults && (
                <div className={`mt-12 bg-white rounded-2xl shadow-2xl text-left ${
                    showResults ? 'fade-up-enter' : ''
                }`} id="scanResultsSection">
                    <div className="p-8">
                        <h3 className="text-2xl font-bold mb-6 text-gray-900">Scan Results</h3>
                        
                        <div className="mb-8">
                            <h4 className="font-semibold text-lg mb-4 text-gray-800">GTM Analysis</h4>
                            <GtmAnalysis scanResults={scanResults} />
                        </div>

                        <details className="mb-6">
                            <summary className="font-semibold text-lg mb-2 cursor-pointer text-gray-800 hover:text-gray-600">
                                Detected GTM Containers
                            </summary>
                            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-40 text-sm mt-2">
                                {JSON.stringify(gtmContainers, null, 2)}
                            </pre>
                        </details>

                        <details>
                            <summary className="font-semibold text-lg mb-2 cursor-pointer text-gray-800 hover:text-gray-600">
                                Raw Scan Results
                            </summary>
                            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm mt-2">
                                {JSON.stringify(scanResults.containerScans, null, 2)}
                            </pre>
                        </details>
                    </div>
                </div>
            )}
        </div>
    );
}

function ScanUrlFormFallback() {
    return (
        <div className="w-full">
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading scan form...</span>
            </div>
        </div>
    );
}

export default function ScanUrlForm() {
    return (
        <Suspense fallback={<ScanUrlFormFallback />}>
            <ScanUrlFormContent />
        </Suspense>
    );
}