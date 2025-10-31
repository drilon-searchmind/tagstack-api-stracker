"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, Calendar, Globe, Users, User, TrendingUp, AlertCircle } from "lucide-react";

// Mock data for demonstration - replace with real data later
const mockCustomers = [
    {
        id: 1,
        name: "Acme Corporation",
        url: "https://www.acme.com",
        lastScan: "2024-10-30",
        status: "active",
        containerCount: 2,
        issuesFound: 0,
        addedDate: "2024-09-15"
    },
    {
        id: 2,
        name: "TechStart Solutions",
        url: "https://techstart.io",
        lastScan: "2024-10-28",
        status: "active",
        containerCount: 1,
        issuesFound: 3,
        addedDate: "2024-10-01"
    },
    {
        id: 3,
        name: "E-commerce Plus",
        url: "https://ecommerceplus.shop",
        lastScan: null,
        status: "pending",
        containerCount: 0,
        issuesFound: 0,
        addedDate: "2024-10-29"
    },
    {
        id: 4,
        name: "Digital Marketing Hub",
        url: "https://digitalmarketing.com",
        lastScan: "2024-10-25",
        status: "active",
        containerCount: 3,
        issuesFound: 1,
        addedDate: "2024-08-20"
    }
];

export default function CustomerTable() {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCustomers = useMemo(() => {
        return mockCustomers.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.url.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    const formatDate = (dateString) => {
        if (!dateString) return "Never";
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            active: { color: "bg-green-100 text-green-800", label: "Active" },
            pending: { color: "bg-orange-100 text-orange-800", label: "Pending" },
            inactive: { color: "bg-gray-100 text-gray-800", label: "Inactive" }
        };
        
        const config = statusConfig[status] || statusConfig.inactive;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                {config.label}
            </span>
        );
    };

    const getIssuesBadge = (issuesCount) => {
        if (issuesCount === 0) {
            return (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    No Issues
                </span>
            );
        }
        return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {issuesCount} Issue{issuesCount !== 1 ? 's' : ''}
            </span>
        );
    };

    return (
        <Card className="border-white/30 shadow-2xl bg-zinc-100">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardTitle className="flex items-center space-x-3 text-xl text-gray-900">
                        <div className="w-10 h-10 bg-gtm-gradient-start rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2>Your Added Customers</h2>
                            <p className="text-sm font-normal text-gray-600 mt-1">
                                Manage and monitor your customer websites
                            </p>
                        </div>
                    </CardTitle>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search customers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 w-64 bg-white/80 border-white/30"
                            />
                        </div>
                        <Button className="bg-gtm-gradient hover:opacity-90 text-white">
                            Add Customer
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {filteredCustomers.length === 0 ? (
                    <div className="text-center py-12">
                        <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {searchTerm ? "No customers found" : "No customers added yet"}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {searchTerm 
                                ? "Try adjusting your search terms" 
                                : "Start by adding your first customer to monitor their GTM setup"
                            }
                        </p>
                        {!searchTerm && (
                            <Button className="bg-gtm-gradient hover:opacity-90 text-white">
                                Add Your First Customer
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Customer</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Containers</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Last Scan</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Issues</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Added</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="border-b border-gray-100 hover:bg-white/50 transition-colors">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-gtm-gradient-end rounded-full flex items-center justify-center">
                                                    <Globe className="w-4 h-4 text-white" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{customer.name}</div>
                                                    <div className="text-sm text-gray-600 flex items-center gap-1">
                                                        <ExternalLink className="w-3 h-3" />
                                                        <a 
                                                            href={customer.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="hover:text-gtm-primary transition-colors"
                                                        >
                                                            {customer.url.replace(/^https?:\/\//, '')}
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            {getStatusBadge(customer.status)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-gray-500" />
                                                <span className="text-gray-900">{customer.containerCount}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-500" />
                                                <span className={`text-sm ${customer.lastScan ? 'text-gray-900' : 'text-gray-500'}`}>
                                                    {formatDate(customer.lastScan)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            {getIssuesBadge(customer.issuesFound)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-sm text-gray-600">
                                                {formatDate(customer.addedDate)}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="text-gray-600 hover:text-gray-900 border-gray-300 hover:border-gray-400 hover:bg-white/80"
                                                >
                                                    Scan Now
                                                </Button>
                                                <Button 
                                                    size="sm"
                                                    className="bg-gtm-gradient hover:opacity-90 text-white"
                                                    onClick={() => {
                                                        // TODO: Navigate to customer details
                                                        console.log('View customer:', customer.id);
                                                    }}
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Summary Stats */}
                {filteredCustomers.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-white/50 rounded-lg border border-white/30">
                                <div className="text-2xl font-bold text-gtm-primary">
                                    {filteredCustomers.length}
                                </div>
                                <div className="text-sm text-gray-600">Total Customers</div>
                            </div>
                            <div className="text-center p-4 bg-white/50 rounded-lg border border-white/30">
                                <div className="text-2xl font-bold text-gtm-secondary">
                                    {filteredCustomers.filter(c => c.status === 'active').length}
                                </div>
                                <div className="text-sm text-gray-600">Active</div>
                            </div>
                            <div className="text-center p-4 bg-white/50 rounded-lg border border-white/30">
                                <div className="text-2xl font-bold text-gtm-accent">
                                    {filteredCustomers.reduce((sum, c) => sum + c.containerCount, 0)}
                                </div>
                                <div className="text-sm text-gray-600">GTM Containers</div>
                            </div>
                            <div className="text-center p-4 bg-white/50 rounded-lg border border-white/30">
                                <div className="text-2xl font-bold" style={{ color: '#dc2626' }}>
                                    {filteredCustomers.reduce((sum, c) => sum + c.issuesFound, 0)}
                                </div>
                                <div className="text-sm text-gray-600">Total Issues</div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}