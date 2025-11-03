"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Trash2, Edit, RefreshCw, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function CustomerActions({ customer, onUpdate }) {
    const [isScanning, setIsScanning] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [scanMessage, setScanMessage] = useState("");

    const handleScan = async () => {
        setIsScanning(true);
        setScanMessage("");
        
        try {
            const response = await fetch('/api/gtm-scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: customer.url,
                    customerId: customer._id
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Scan failed');
            }

            setScanMessage(`Scan completed! Found ${data.containerCount || 0} GTM containers.`);
            
            if (onUpdate && data.customer) {
                onUpdate(data.customer);
            }

        } catch (error) {
            setScanMessage(`Scan failed: ${error.message}`);
        } finally {
            setIsScanning(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) {
            return;
        }

        setIsDeleting(true);
        
        try {
            const response = await fetch(`/api/customer/${customer._id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete customer');
            }

            window.location.href = '/dashboard';

        } catch (error) {
            alert(`Failed to delete customer: ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Card className="border-white/30 shadow-2xl bg-zinc-100">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-gray-900">
                    <Play className="w-5 h-5 text-gtm-accent" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button 
                    onClick={handleScan}
                    disabled={isScanning}
                    className="w-full bg-gtm-gradient hover:opacity-90 text-white"
                >
                    {isScanning ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Scanning...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Run GTM Scan
                        </>
                    )}
                </Button>

                {scanMessage && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                        scanMessage.includes('failed') 
                            ? 'bg-red-50 border border-red-200 text-red-700' 
                            : 'bg-green-50 border border-green-200 text-green-700'
                    }`}>
                        {scanMessage.includes('failed') ? (
                            <AlertCircle className="w-4 h-4" />
                        ) : (
                            <CheckCircle className="w-4 h-4" />
                        )}
                        {scanMessage}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <Button 
                        variant="outline"
                        className="text-gray-600 hover:text-gray-900 border-gray-300 hover:border-gray-400 hover:bg-white/80"
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                    <Button 
                        variant="outline"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 hover:bg-red-50"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Delete
                    </Button>
                </div>

                <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Available Actions</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-gtm-gradient-start rounded-full mt-2 flex-shrink-0"></div>
                            <span>Run GTM scans to detect containers and tags</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-gtm-gradient-start rounded-full mt-2 flex-shrink-0"></div>
                            <span>Edit customer information and settings</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-gtm-gradient-start rounded-full mt-2 flex-shrink-0"></div>
                            <span>View detailed scan history and analytics</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-gtm-gradient-start rounded-full mt-2 flex-shrink-0"></div>
                            <span>Enable/disable monitoring alerts</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}