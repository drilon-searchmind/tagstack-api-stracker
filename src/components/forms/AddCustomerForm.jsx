"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Globe, UserPlus, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function AddCustomerForm({ onCustomerAdded, onCancel }) {
    const [formData, setFormData] = useState({
        name: "",
        url: ""
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError("");
        setSuccess("");
    };

    const validateUrl = (url) => {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `https://${url}`;
        }
        return url;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const validatedUrl = validateUrl(formData.url);
            
            const response = await fetch('/api/customer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    url: validatedUrl
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add customer');
            }

            setSuccess("Customer added successfully!");
            setFormData({ name: "", url: "" });
            
            setTimeout(() => {
                onCustomerAdded(data.customer);
            }, 1500);

        } catch (error) {
            setError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-white/30 shadow-2xl bg-zinc-100">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <CardTitle className="flex items-center space-x-3 text-xl text-gray-900">
                        <div className="w-10 h-10 bg-gtm-gradient-start rounded-full flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2>Add New Customer</h2>
                            <p className="text-sm font-normal text-gray-600 mt-1">
                                Add a customer website to monitor their GTM setup
                            </p>
                        </div>
                    </CardTitle>
                    <Button 
                        variant="outline"
                        onClick={onCancel}
                        className="text-gray-600 hover:text-gray-900 border-gray-300 hover:border-gray-400 hover:bg-white/80"
                    >
                        View Customers
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium text-gray-900">
                                Customer Name
                            </label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                placeholder="e.g., Acme Corporation"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                className="bg-white/80 border-white/30"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="url" className="text-sm font-medium text-gray-900">
                                Website URL
                            </label>
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <Input
                                    id="url"
                                    name="url"
                                    type="text"
                                    placeholder="www.example.com"
                                    value={formData.url}
                                    onChange={handleInputChange}
                                    required
                                    className="pl-10 bg-white/80 border-white/30"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                Protocol (https://) will be added automatically if not provided
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                            <span className="text-sm text-red-700">{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-green-700">{success}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="text-gray-600 hover:text-gray-900 border-gray-300 hover:border-gray-400 hover:bg-white/80"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !formData.name.trim() || !formData.url.trim()}
                            className="bg-gtm-gradient hover:opacity-90 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Adding Customer...
                                </>
                            ) : (
                                "Add Customer"
                            )}
                        </Button>
                    </div>
                </form>

                <div className="mt-8 p-6 bg-white/50 rounded-lg border border-white/30">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">What happens next?</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-gtm-gradient-start rounded-full mt-2 flex-shrink-0"></div>
                            <span>Your customer will be added to your monitoring dashboard</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-gtm-gradient-start rounded-full mt-2 flex-shrink-0"></div>
                            <span>You can perform GTM scans to detect containers and tags</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 bg-gtm-gradient-start rounded-full mt-2 flex-shrink-0"></div>
                            <span>Enable monitoring to track changes over time</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}