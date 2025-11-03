"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ExternalLink, Calendar, Globe, Users, User, TrendingUp, AlertCircle, Loader2 } from "lucide-react";
import AddCustomerForm from "@/components/forms/AddCustomerForm";

export default function CustomerTable() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/customer');
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch customers');
            }
            
            setCustomers(data.customers || []);
        } catch (error) {
            setError(error.message);
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerAdded = (newCustomer) => {
        setCustomers(prev => [newCustomer, ...prev]);
        setShowAddForm(false);
    };

    const handleToggleView = () => {
        setShowAddForm(!showAddForm);
    };

    const filteredCustomers = useMemo(() => {
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.url.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [customers, searchTerm]);

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

    const getIssuesBadge = (isMonitored) => {
        if (isMonitored === true) {
            return (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Monitored
                </span>
            );
        }
        return (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Not Monitored
            </span>
        );
    };

    if (showAddForm) {
        return (
            <AddCustomerForm 
                onCustomerAdded={handleCustomerAdded}
                onCancel={handleToggleView}
            />
        );
    }

    if (loading) {
        return (
            <Card className="border-white/30 shadow-2xl bg-zinc-100">
                <CardContent className="py-12">
                    <div className="flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-600 mr-3" />
                        <span className="text-lg text-gray-700">Loading customers...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-white/30 shadow-2xl bg-zinc-100">
                <CardContent className="py-12">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Customers</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={fetchCustomers} className="bg-gtm-gradient hover:opacity-90 text-white">
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

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
                        <Button 
                            onClick={handleToggleView}
                            className="bg-gtm-gradient hover:opacity-90 text-white"
                        >
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
                            <Button 
                                onClick={handleToggleView}
                                className="bg-gtm-gradient hover:opacity-90 text-white"
                            >
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
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Monitored</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-900">Added</th>
                                    <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer._id} className="border-b border-gray-100 hover:bg-white/50 transition-colors">
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
                                            {getIssuesBadge(customer.isMonitored)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-sm text-gray-600">
                                                {formatDate(customer.addedDate || customer.createdAt)}
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
                                                        console.log('View customer:', customer._id);
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
                                    {filteredCustomers.reduce((sum, c) => sum + (c.isMonitored ? 1 : 0), 0)} / {filteredCustomers.length}
                                </div>
                                <div className="text-sm text-gray-600">Total Monitored</div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}