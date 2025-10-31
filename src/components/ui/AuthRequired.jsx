import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, LogIn } from "lucide-react";
import Link from "next/link";

export default function AuthRequired() {
    return (
        <div className="w-full">
            <Card className="glass-morph border-white/30 shadow-2xl">
                <CardContent className="p-8 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-gtm-primary to-gtm-secondary rounded-full flex items-center justify-center">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-50 mb-4">Authentication Required</h3>
                    <p className="text-gray-400 mb-6 text-lg">
                        You must be signed in to use the GTM Container Scanner. Please log in to access this feature.
                    </p>
                    <Button asChild className="w-auto bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-800 hover:to-gray-950 text-white text-lg font-semibold shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 py-8">
                        <Link href="/login">
                            <LogIn className="w-5 h-5 mr-2" />
                            Sign In to Continue
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}