"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Lock, LogIn } from "lucide-react";
import GtmAnalysis from "@/components/analysis/GtmAnalysis";
import ScanningOverlay from "@/components/ui/ScanningOverlay";
import { FaSearch } from "react-icons/fa";
import Link from "next/link";

export default function ScanUrlForm() {
    const { data: session, status } = useSession();
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [scanResults, setScanResults] = useState(null);
    const [error, setError] = useState(null);
    const [gtmContainers, setGtmContainers] = useState([]);
    const [showResults, setShowResults] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!url || !session) return;

        setIsLoading(true);
        setError(null);
        setScanResults(null);
        setGtmContainers([]);
        setShowResults(false);

        try {
            const respGtm = await fetch(`/api/gtm-scan-id?url=${encodeURIComponent(url)}`);
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

            setScanResults({
                requestedUrl: url,
                gtmScan: gtmJson,
                containers,
                containerScans
            });
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
        return (
            <div className="w-full">
                <Card className="glass-morph border-white/30 shadow-2xl">
                    <CardContent className="p-8 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h3>
                        <p className="text-gray-600 mb-6 text-lg">
                            You must be signed in to use the GTM Container Scanner. Please log in to access this feature.
                        </p>
                        <Button asChild className="bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-gray-950 text-white px-8 py-3 text-lg font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105">
                            <Link href="/login">
                                <LogIn className="w-5 h-5 mr-2" />
                                Sign In to Continue
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full relative">
            {/* Scanning Overlay Component */}
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
                        className="bg-white text-gray-900 hover:bg-gray-100 h-14 px-8 text-lg font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105" 
                        type="submit" 
                        disabled={isLoading || !url}
                    >
                        <FaSearch className="mr-2 h-5 w-5" />
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