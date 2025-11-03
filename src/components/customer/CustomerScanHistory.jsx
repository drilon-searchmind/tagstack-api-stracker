"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, Calendar, TrendingUp, Globe, AlertCircle, CheckCircle } from "lucide-react";

export default function CustomerScanHistory({ customer, onUpdate }) {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const scanHistory = customer.scanHistory || [];
    const sortedHistory = [...scanHistory].sort((a, b) => new Date(b.scanDate) - new Date(a.scanDate));

    return (
        <Card className="border-white/30 shadow-2xl bg-zinc-100">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-gray-900">
                    <History className="w-5 h-5 text-gtm-secondary" />
                    Scan History
                </CardTitle>
            </CardHeader>
            <CardContent>
                {sortedHistory.length === 0 ? (
                    <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Scan History</h3>
                        <p className="text-gray-600 mb-4">
                            This customer hasn't been scanned yet. Run your first scan to see GTM container data.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sortedHistory.slice(0, 5).map((scan, index) => (
                            <div key={index} className="relative">
                                <div className="flex items-start gap-4 p-4 bg-white/50 rounded-lg border border-white/30">
                                    <div className="w-12 h-12 bg-gtm-gradient rounded-full flex items-center justify-center flex-shrink-0">
                                        <Globe className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium text-gray-900">
                                                GTM Scan Completed
                                            </h4>
                                            <span className="text-sm text-gray-500">
                                                {formatDate(scan.scanDate)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mb-3">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-gtm-primary" />
                                                <span className="text-sm text-gray-700">
                                                    <strong>{scan.containersFound}</strong> containers found
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {scan.containersFound > 0 ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                                )}
                                                <span className="text-sm text-gray-700">
                                                    {scan.containersFound > 0 ? 'GTM Detected' : 'No GTM Found'}
                                                </span>
                                            </div>
                                        </div>
                                        {scan.scanResults && Object.keys(scan.scanResults).length > 0 && (
                                            <div className="mt-3 p-3 bg-white/30 rounded border">
                                                <h5 className="text-xs font-medium text-gray-700 mb-2">Scan Details</h5>
                                                <div className="text-xs text-gray-600 space-y-1">
                                                    {scan.scanResults.status && (
                                                        <div>Status: <span className="font-medium">{scan.scanResults.status}</span></div>
                                                    )}
                                                    {scan.scanResults.responseTime && (
                                                        <div>Response Time: <span className="font-medium">{scan.scanResults.responseTime}ms</span></div>
                                                    )}
                                                    {scan.scanResults.errors && scan.scanResults.errors.length > 0 && (
                                                        <div>Errors: <span className="font-medium text-red-600">{scan.scanResults.errors.length}</span></div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {sortedHistory.length > 5 && (
                            <div className="text-center pt-4 border-t border-gray-200">
                                <p className="text-sm text-gray-600">
                                    Showing 5 most recent scans out of {sortedHistory.length} total
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}