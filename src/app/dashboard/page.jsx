"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, Shield, Mail, Calendar } from "lucide-react";
import ScanUrlForm from "@/components/forms/ScanUrlForm";
import CustomerTable from "@/components/ui/CustomerTable";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "loading") return; // Still loading
        if (!session) {
            router.push("/login");
        }
    }, [session, status, router]);

    if (status === "loading") {
        return (
            <div className="login-section min-h-screen flex items-center justify-center">
                <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
                <div className="dots-pattern absolute inset-0 opacity-10"></div>
                <div className="flex items-center space-x-2 relative z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
                    <span className="text-lg text-gray-700">Loading...</span>
                </div>
            </div>
        );
    }

    if (!session) {
        return null; // Will redirect to login
    }

    return (
        <div className="login-section min-h-screen">
            <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
            <div className="dots-pattern absolute inset-0 opacity-10"></div>
            
            <div className="max-w-[var(--max-width-desktop)] mx-auto py-8 relative z-10 pt-40" id="dashboard-page">
                <div className="mb-8">
                    <Card className="glass-morph border-white/30 shadow-2xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-3 text-2xl text-gray-900">
                                <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1>Welcome, {session.user.firstName || session.user.username}!</h1>
                                    <p className="text-sm font-normal text-gray-600 mt-1">
                                        Ready to scan and analyze your websites
                                    </p>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex items-center space-x-3 p-4 bg-white/50 rounded-lg">
                                    <Mail className="w-5 h-5 text-blue-500" />
                                    <div>
                                        <p className="text-sm text-gray-600">Email</p>
                                        <p className="font-medium text-gray-900">{session.user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-4 bg-white/50 rounded-lg">
                                    <Shield className="w-5 h-5 text-green-500" />
                                    <div>
                                        <p className="text-sm text-gray-600">Role</p>
                                        <p className="font-medium text-gray-900 capitalize">{session.user.role}</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 p-4 bg-white/50 rounded-lg">
                                    <User className="w-5 h-5 text-purple-500" />
                                    <div>
                                        <p className="text-sm text-gray-600">Username</p>
                                        <p className="font-medium text-gray-900">{session.user.username}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Customer Table Section */}
                <div className="mb-8">
                    <CustomerTable />
                </div>
            </div>
        </div>
    );
}