"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Mail, Lock, User } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) return;

        setIsLoading(true);
        setError(null);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Invalid email or password");
            } else {
                const session = await getSession();
                router.push("/"); // Redirect to home instead of dashboard
            }
        } catch (err) {
            console.error("Login error:", err);
            setError("An error occurred during login");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-section min-h-screen flex items-center justify-center p-4">
            <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
            <div className="dots-pattern absolute inset-0 opacity-10"></div>
            
            <div className="w-full max-w-md relative z-10">
                <Card className="glass-morph border-white/30 shadow-2xl">
                    <CardContent className="p-8">
                        <div className="text-center mb-8">
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                                    <User className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                            <p className="text-gray-600">Sign in to your TagStack account</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                        className="pl-10 h-12 bg-white/90 backdrop-blur border-white/30 focus:bg-white focus:border-white shadow-lg"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        className="pl-10 h-12 bg-white/90 backdrop-blur border-white/30 focus:bg-white focus:border-white shadow-lg"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-4 text-red-700 bg-red-100/80 backdrop-blur rounded-lg border border-red-200/50">
                                    {error}
                                </div>
                            )}

                            <Button 
                                className="w-full bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-gray-950 text-white h-12 text-lg font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105" 
                                type="submit" 
                                disabled={isLoading || !email || !password}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Test credentials: <br />
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                    test@tagstack.com / test123
                                </span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}