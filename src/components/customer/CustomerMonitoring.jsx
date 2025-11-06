"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Bell, BellOff, Settings, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function CustomerMonitoring({ customer, onUpdate }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState("");

    const handleToggleMonitoring = async () => {
        setIsUpdating(true);
        setMessage("");
        
        try {
            const response = await fetch(`/api/customer/${customer._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    isMonitored: !customer.isMonitored
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update monitoring status');
            }

            setMessage(`Monitoring ${!customer.isMonitored ? 'enabled' : 'disabled'} successfully!`);
            
            if (onUpdate && data.customer) {
                onUpdate(data.customer);
            }

        } catch (error) {
            setMessage(`Failed to update monitoring: ${error.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Card className="border-white/30 shadow-2xl bg-zinc-100">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-gray-900">
                    <Monitor className="w-5 h-5 text-gtm-accent" />
                    Monitoring
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-white/50 rounded-lg border border-white/30">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="font-medium text-gray-900">Monitor Status</h4>
                            <p className="text-sm text-gray-600">
                                {customer.isMonitored 
                                    ? 'This customer is being actively monitored' 
                                    : 'This customer is not being monitored'
                                }
                            </p>
                        </div>
                        <div className={`p-2 rounded-full ${
                            customer.isMonitored 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-gray-100 text-gray-600'
                        }`}>
                            {customer.isMonitored ? (
                                <Bell className="w-5 h-5" />
                            ) : (
                                <BellOff className="w-5 h-5" />
                            )}
                        </div>
                    </div>
                    
                    <Button 
                        onClick={handleToggleMonitoring}
                        disabled={isUpdating}
                        className={`w-full ${
                            customer.isMonitored 
                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                : 'bg-gtm-gradient hover:opacity-90 text-white'
                        }`}
                    >
                        {isUpdating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                {customer.isMonitored ? (
                                    <>
                                        <BellOff className="w-4 h-4 mr-2" />
                                        Disable Monitoring
                                    </>
                                ) : (
                                    <>
                                        <Bell className="w-4 h-4 mr-2" />
                                        Enable Monitoring
                                    </>
                                )}
                            </>
                        )}
                    </Button>
                </div>

                {message && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                        message.includes('Failed') 
                            ? 'bg-red-50 border border-red-200 text-red-700' 
                            : 'bg-green-50 border border-green-200 text-green-700'
                    }`}>
                        {message.includes('Failed') ? (
                            <AlertCircle className="w-4 h-4" />
                        ) : (
                            <CheckCircle className="w-4 h-4" />
                        )}
                        {message}
                    </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Monitoring Features</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                customer.isMonitored ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                            <span>Automatic daily GTM container scans</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                customer.isMonitored ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                            <span>Change detection and alerts</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                customer.isMonitored ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                            <span>Historical trend analysis</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                customer.isMonitored ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                            <span>Email notifications for issues</span>
                        </div>
                    </div>
                </div>

                {customer.isMonitored && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-blue-800 text-sm">
                            <Settings className="w-4 h-4" />
                            <span className="font-medium">Active Monitoring</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1">
                            Next automated scan scheduled for tomorrow at 9:00 AM
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}