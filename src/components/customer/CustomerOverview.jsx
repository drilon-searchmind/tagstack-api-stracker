"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, TrendingUp, Globe, Clock, Shield, AlertTriangle } from "lucide-react";

export default function CustomerOverview({ customer, onUpdate }) {
    const formatDate = (dateString) => {
        if (!dateString) return "Never";
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'text-green-600 bg-green-100';
            case 'pending': return 'text-orange-600 bg-orange-100';
            case 'inactive': return 'text-gray-600 bg-gray-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getDaysSince = (date) => {
        if (!date) return null;
        const now = new Date();
        const scanDate = new Date(date);
        const diffTime = Math.abs(now - scanDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysSinceLastScan = getDaysSince(customer.lastScan);

    return (
        <Card className="border-white/30 shadow-2xl bg-zinc-100">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-gray-900">
                    <TrendingUp className="w-5 h-5 text-gtm-primary" />
                    Customer Overview
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="p-4 bg-white/50 rounded-lg border border-white/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600">Status</span>
                                <Shield className="w-4 h-4 text-gray-500" />
                            </div>
                            <span className={`px-2 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(customer.status)}`}>
                                {customer.status}
                            </span>
                        </div>

                        <div className="p-4 bg-white/50 rounded-lg border border-white/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600">GTM Containers</span>
                                <Globe className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="text-2xl font-bold text-gtm-primary">
                                {customer.containerCount}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {customer.containerCount === 0 ? 'No containers detected' : 
                                 customer.containerCount === 1 ? '1 container found' : 
                                 `${customer.containerCount} containers found`}
                            </p>
                        </div>

                        <div className="p-4 bg-white/50 rounded-lg border border-white/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600">Added Date</span>
                                <Calendar className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="text-sm text-gray-900">
                                {formatDate(customer.addedDate || customer.createdAt)}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-white/50 rounded-lg border border-white/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600">Last Scan</span>
                                <Clock className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="text-sm text-gray-900">
                                {customer.lastScan ? formatDate(customer.lastScan) : "Never scanned"}
                            </div>
                            {daysSinceLastScan && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {daysSinceLastScan === 1 ? '1 day ago' : `${daysSinceLastScan} days ago`}
                                </p>
                            )}
                        </div>

                        <div className="p-4 bg-white/50 rounded-lg border border-white/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600">Monitoring Status</span>
                                <AlertTriangle className="w-4 h-4 text-gray-500" />
                            </div>
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                customer.isMonitored 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {customer.isMonitored ? 'Monitored' : 'Not Monitored'}
                            </span>
                        </div>

                        <div className="p-4 bg-white/50 rounded-lg border border-white/30">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-600">Total Scans</span>
                                <TrendingUp className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="text-2xl font-bold text-gtm-secondary">
                                {customer.scanHistory?.length || 0}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Historical scan records
                            </p>
                        </div>
                    </div>
                </div>

                {customer.notes && (
                    <div className="mt-6 p-4 bg-white/50 rounded-lg border border-white/30">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                        <p className="text-sm text-gray-700">{customer.notes}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}