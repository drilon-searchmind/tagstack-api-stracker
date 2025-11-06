"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Globe, Calendar, Clock, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import GtmAnalysis from "@/components/analysis/GtmAnalysis";

export default function ScanResultsPage({ params }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [scanData, setScanData] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [customerId, setCustomerId] = useState(null);
    const [scanId, setScanId] = useState(null);
    const [hasFetched, setHasFetched] = useState(false);

    useEffect(() => {
        const initializeParams = async () => {
            const resolvedParams = await params;
            setCustomerId(resolvedParams.customerId);
            setScanId(resolvedParams.scanId);
        };
        initializeParams();
    }, [params]);

    const fetchScanResults = useCallback(async () => {
        if (!customerId || !scanId) return;
        
        try {
            setLoading(true);
            
            // Fetch scan data
            const scanResponse = await fetch(`/api/scanned-url/${scanId}?customerId=${customerId}`);
            const scanDataResult = await scanResponse.json();
            
            if (!scanResponse.ok) {
                throw new Error(scanDataResult.error || 'Failed to fetch scan results');
            }
            
            // Fetch customer data
            const customerResponse = await fetch(`/api/customer/${customerId}`);
            const customerDataResult = await customerResponse.json();
            
            if (!customerResponse.ok) {
                throw new Error(customerDataResult.error || 'Failed to fetch customer');
            }
            
            setScanData(scanDataResult.scan);
            setCustomer(customerDataResult.customer);
            setHasFetched(true);
        } catch (error) {
            setError(error.message);
            console.error('Error fetching scan results:', error);
        } finally {
            setLoading(false);
        }
    }, [customerId, scanId]);

    useEffect(() => {
        if (status === "loading" || !customerId || !scanId || hasFetched) return;
        if (!session) {
            router.push("/login");
            return;
        }
        fetchScanResults();
    }, [session, status, customerId, scanId, hasFetched]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getScanDuration = (duration) => {
        if (!duration) return 'Unknown';
        if (duration > 1000) {
            return `${(duration / 1000).toFixed(1)} seconds`;
        }
        return `${duration}ms`;
    };

    const getContainerCount = () => {
        return scanData?.scanData?.containers?.length || scanData?.containers?.length || 0;
    };

    // Convert scan data to the format expected by GtmAnalysis
    const formatScanResults = () => {
        if (!scanData) return null;
        
        return {
            requestedUrl: scanData.requestedUrl,
            gtmScan: scanData.scanData?.gtmScan || scanData.gtmScan || {},
            containers: scanData.scanData?.containers || scanData.containers || [],
            containerScans: scanData.scanData?.containerScans || scanData.containerScans || []
        };
    };

    if (status === "loading" || loading || !customerId || !scanId) {
        return (
            <div className="login-section min-h-screen flex items-center justify-center">
                <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
                <div className="dots-pattern absolute inset-0 opacity-10"></div>
                <div className="flex items-center space-x-2 relative z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
                    <span className="text-lg text-gray-700">Loading scan results...</span>
                </div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    if (error) {
        return (
            <div className="login-section min-h-screen">
                <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
                <div className="dots-pattern absolute inset-0 opacity-10"></div>
                <div className="max-w-[var(--max-width-desktop)] mx-auto py-8 relative z-10 pt-40">
                    <Card className="border-white/30 shadow-2xl bg-zinc-100">
                        <CardContent className="py-12">
                            <div className="text-center">
                                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Scan Results</h3>
                                <p className="text-gray-600 mb-4">{error}</p>
                                <div className="flex items-center justify-center gap-4">
                                    <Button 
                                        variant="outline"
                                        onClick={() => router.push(`/dashboard/customer/${customerId}`)}
                                        className="text-gray-600 hover:text-gray-900"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Customer
                                    </Button>
                                    <Button onClick={fetchScanResults} className="bg-gtm-gradient hover:opacity-90 text-white">
                                        Try Again
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!scanData || !customer) {
        return (
            <div className="login-section min-h-screen">
                <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
                <div className="dots-pattern absolute inset-0 opacity-10"></div>
                <div className="max-w-[var(--max-width-desktop)] mx-auto py-8 relative z-10 pt-40">
                    <Card className="border-white/30 shadow-2xl bg-zinc-100">
                        <CardContent className="py-12">
                            <div className="text-center">
                                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Scan Results Not Found</h3>
                                <p className="text-gray-600 mb-4">The scan results you're looking for don't exist or you don't have access to them.</p>
                                <Button 
                                    onClick={() => router.push('/dashboard')}
                                    className="bg-gtm-gradient hover:opacity-90 text-white"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Dashboard
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const scanResults = formatScanResults();

    return (
        <div className="login-section min-h-screen">
            <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
            <div className="dots-pattern absolute inset-0 opacity-10"></div>
            
            <div className="max-w-[var(--max-width-desktop)] mx-auto py-8 relative z-10 pt-40">
                <div className="mb-6">
                    <Button 
                        variant="outline"
                        onClick={() => router.push(`/dashboard/customer/${customerId}`)}
                        className="text-gray-600 hover:text-gray-900 border-gray-300 hover:border-gray-400 hover:bg-white/80"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to {customer.name}
                    </Button>
                </div>

                {/* Scan Header */}
                <div className="mb-8">
                    <Card className="glass-morph border-white/30 shadow-2xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-2xl text-gray-900">
                                    <div className="w-12 h-12 bg-gtm-gradient-start rounded-full flex items-center justify-center">
                                        <Globe className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1>Scan Results</h1>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">{formatDate(scanData.scanDate)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {getContainerCount() > 0 ? (
                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            GTM Detected
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            No GTM Found
                                        </span>
                                    )}
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="w-5 h-5 text-gtm-primary" />
                                    <div>
                                        <div className="text-sm text-gray-600">Scanned URL</div>
                                        <a 
                                            href={scanData.requestedUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="font-medium text-gray-900 hover:text-gtm-primary transition-colors truncate"
                                        >
                                            {scanData.requestedUrl}
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Clock className="w-5 h-5 text-gtm-secondary" />
                                    <div>
                                        <div className="text-sm text-gray-600">Scan Duration</div>
                                        <div className="font-medium text-gray-900">{getScanDuration(scanData.scanDuration)}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-gtm-accent" />
                                    <div>
                                        <div className="text-sm text-gray-600">Containers Found</div>
                                        <div className="font-medium text-gray-900">{getContainerCount()}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Scan Results Content */}
                {scanResults && (
                    <div className="bg-white rounded-2xl shadow-2xl text-left">
                        <div className="p-8">
                            <h3 className="text-2xl font-bold mb-6 text-gray-900">GTM Analysis Results</h3>
                            
                            <div className="mb-8">
                                <h4 className="font-semibold text-lg mb-4 text-gray-800">GTM Analysis</h4>
                                <GtmAnalysis scanResults={scanResults} />
                            </div>

                            <details className="mb-6">
                                <summary className="font-semibold text-lg mb-2 cursor-pointer text-gray-800 hover:text-gray-600">
                                    Detected GTM Containers
                                </summary>
                                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-40 text-sm mt-2">
                                    {JSON.stringify(scanResults.containers, null, 2)}
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
        </div>
    );
}