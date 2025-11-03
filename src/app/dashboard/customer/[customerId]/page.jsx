"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Globe, Calendar, TrendingUp, AlertCircle, CheckCircle, Monitor, Shield, ExternalLink } from "lucide-react";
import CustomerOverview from "@/components/customer/CustomerOverview";
import CustomerScanHistory from "@/components/customer/CustomerScanHistory";
import CustomerMonitoring from "@/components/customer/CustomerMonitoring";
import CustomerActions from "@/components/customer/CustomerActions";

export default function CustomerDetailPage({ params }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [customerId, setCustomerId] = useState(null);

    useEffect(() => {
        const initializeParams = async () => {
            const resolvedParams = await params;
            setCustomerId(resolvedParams.customerId);
        };
        initializeParams();
    }, [params]);

    const fetchCustomer = useCallback(async () => {
        if (!customerId) return;
        
        try {
            setLoading(true);
            const response = await fetch(`/api/customer/${customerId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch customer');
            }
            
            setCustomer(data.customer);
        } catch (error) {
            setError(error.message);
            console.error('Error fetching customer:', error);
        } finally {
            setLoading(false);
        }
    }, [customerId]);

    useEffect(() => {
        if (status === "loading" || !customerId) return;
        if (!session) {
            router.push("/login");
            return;
        }
        fetchCustomer();
    }, [session, status, customerId, fetchCustomer]);

    const handleCustomerUpdate = (updatedCustomer) => {
        setCustomer(updatedCustomer);
    };

    if (status === "loading" || loading || !customerId) {
        return (
            <div className="login-section min-h-screen flex items-center justify-center">
                <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
                <div className="dots-pattern absolute inset-0 opacity-10"></div>
                <div className="flex items-center space-x-2 relative z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
                    <span className="text-lg text-gray-700">Loading customer details...</span>
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
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Customer</h3>
                                <p className="text-gray-600 mb-4">{error}</p>
                                <div className="flex items-center justify-center gap-4">
                                    <Button 
                                        variant="outline"
                                        onClick={() => router.push('/dashboard')}
                                        className="text-gray-600 hover:text-gray-900"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Dashboard
                                    </Button>
                                    <Button onClick={fetchCustomer} className="bg-gtm-gradient hover:opacity-90 text-white">
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

    if (!customer) {
        return (
            <div className="login-section min-h-screen">
                <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
                <div className="dots-pattern absolute inset-0 opacity-10"></div>
                <div className="max-w-[var(--max-width-desktop)] mx-auto py-8 relative z-10 pt-40">
                    <Card className="border-white/30 shadow-2xl bg-zinc-100">
                        <CardContent className="py-12">
                            <div className="text-center">
                                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Not Found</h3>
                                <p className="text-gray-600 mb-4">The customer you're looking for doesn't exist or you don't have access to it.</p>
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

    return (
        <div className="login-section min-h-screen">
            <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
            <div className="dots-pattern absolute inset-0 opacity-10"></div>
            
            <div className="max-w-[var(--max-width-desktop)] mx-auto py-8 relative z-10 pt-40">
                <div className="mb-6">
                    <Button 
                        variant="outline"
                        onClick={() => router.push('/dashboard')}
                        className="text-gray-600 hover:text-gray-900 border-gray-300 hover:border-gray-400 hover:bg-white/80"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

                <div className="mb-8">
                    <Card className="glass-morph border-white/30 shadow-2xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-2xl text-gray-900">
                                    <div className="w-12 h-12 bg-gtm-gradient-start rounded-full flex items-center justify-center">
                                        <Globe className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1>{customer.name}</h1>
                                        <div className="flex items-center gap-2 mt-1">
                                            <ExternalLink className="w-4 h-4 text-gray-500" />
                                            <a 
                                                href={customer.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-sm text-gray-600 hover:text-gtm-primary transition-colors"
                                            >
                                                {customer.url.replace(/^https?:\/\//, '')}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {customer.isMonitored ? (
                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" />
                                            Monitored
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Not Monitored
                                        </span>
                                    )}
                                </div>
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <CustomerOverview customer={customer} onUpdate={handleCustomerUpdate} />
                        <CustomerScanHistory customer={customer} onUpdate={handleCustomerUpdate} />
                    </div>
                    
                    <div className="space-y-8">
                        <CustomerActions customer={customer} onUpdate={handleCustomerUpdate} />
                        <CustomerMonitoring customer={customer} onUpdate={handleCustomerUpdate} />
                    </div>
                </div>
            </div>
        </div>
    );
}