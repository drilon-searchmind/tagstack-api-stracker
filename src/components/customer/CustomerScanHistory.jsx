"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Calendar, Globe, AlertCircle, CheckCircle, Loader2, Eye, ChevronDown, ChevronUp } from "lucide-react";

export default function CustomerScanHistory({ customer, onUpdate }) {
    const [scanHistory, setScanHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showAll, setShowAll] = useState(false);
    const [selectedScan, setSelectedScan] = useState(null);

    useEffect(() => {
        if (customer?._id) {
            fetchScanHistory();
        }
    }, [customer?._id]);

    const fetchScanHistory = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/scanned-url?customerId=${customer._id}&limit=20`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch scan history');
            }
            
            setScanHistory(data.scans || []);
        } catch (error) {
            setError(error.message);
            console.error('Error fetching scan history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getContainerCount = (scan) => {
        return scan.scanData?.containers?.length || scan.containers?.length || 0;
    };

    const getScanDuration = (scan) => {
        const duration = scan.scanDuration || 0;
        if (duration > 1000) {
            return `${(duration / 1000).toFixed(1)}s`;
        }
        return `${duration}ms`;
    };

    const handleViewScan = (scan) => {
        setSelectedScan(selectedScan?._id === scan._id ? null : scan);
    };

    const displayedScans = showAll ? scanHistory : scanHistory.slice(0, 5);

    return (
        <Card className="border-white/30 shadow-2xl bg-zinc-100">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-gray-900">
                    <History className="w-5 h-5 text-gtm-secondary" />
                    Scan History
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-600 mr-3" />
                        <span className="text-gray-700">Loading scan history...</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Scan History</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button 
                            onClick={fetchScanHistory}
                            variant="outline"
                            className="text-gtm-primary hover:text-gtm-secondary"
                        >
                            Try Again
                        </Button>
                    </div>
                ) : scanHistory.length === 0 ? (
                    <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Scan History</h3>
                        <p className="text-gray-600 mb-4">
                            This customer hasn't been scanned yet. Run your first scan to see GTM container data.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {displayedScans.map((scan, index) => (
                            <div key={scan._id || index} className="space-y-2">
                                {/* Compact Scan Card */}
                                <div className="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-white/30 hover:bg-white/70 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gtm-gradient rounded-full flex items-center justify-center flex-shrink-0">
                                            <Globe className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 text-sm">
                                                {formatDate(scan.scanDate)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getContainerCount(scan) > 0 ? (
                                                    <>
                                                        <CheckCircle className="w-3 h-3 text-green-500" />
                                                        <span className="text-xs text-gray-600">GTM Detected</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertCircle className="w-3 h-3 text-orange-500" />
                                                        <span className="text-xs text-gray-600">No GTM Found</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewScan(scan)}
                                        className="text-xs"
                                    >
                                        <Eye className="w-3 h-3 mr-1" />
                                        View Results
                                    </Button>
                                </div>

                                {/* Expanded Scan Details */}
                                {selectedScan?._id === scan._id && (
                                    <div className="ml-11 p-4 bg-white/30 rounded-lg border border-white/20 animate-in slide-in-from-top-2 duration-200">
                                        <h5 className="text-sm font-medium text-gray-700 mb-3">Scan Details</h5>
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div className="space-y-1">
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-medium">Containers:</span> {getContainerCount(scan)}
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-medium">Duration:</span> {getScanDuration(scan)}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-medium">Status:</span> 
                                                    <span className="capitalize ml-1">{scan.scanStatus || 'completed'}</span>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    <span className="font-medium">URL:</span> 
                                                    <span className="ml-1 truncate">{scan.requestedUrl}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {getContainerCount(scan) > 0 && (
                                            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                                                <h6 className="text-xs font-medium text-green-800 mb-2">GTM Containers Found</h6>
                                                <div className="space-y-1">
                                                    {(scan.scanData?.containers || scan.containers || []).map((container, idx) => (
                                                        <div key={idx} className="text-xs text-green-700 font-mono">
                                                            {container.id || container}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {scan.notes && (
                                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                                <h6 className="text-xs font-medium text-blue-800 mb-1">Notes</h6>
                                                <p className="text-xs text-blue-700">{scan.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        {scanHistory.length > 5 && (
                            <div className="text-center pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600 mb-3">
                                    {showAll 
                                        ? `Showing all ${scanHistory.length} scans`
                                        : `Showing 5 of ${scanHistory.length} scans`
                                    }
                                </p>
                                <Button 
                                    onClick={() => setShowAll(!showAll)}
                                    variant="outline"
                                    size="sm"
                                    className="text-gtm-primary hover:text-gtm-secondary"
                                >
                                    {showAll ? (
                                        <>
                                            <ChevronUp className="w-4 h-4 mr-1" />
                                            Show Less
                                        </>
                                    ) : (
                                        <>
                                            <ChevronDown className="w-4 h-4 mr-1" />
                                            View All Scans
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}