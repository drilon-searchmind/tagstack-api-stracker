"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ScanUrlForm() {
    const [url, setUrl] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [scanResults, setScanResults] = useState(null);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!url) return;

        setIsLoading(true);
        setError(null);
        setScanResults(null);

        try {
            const response = await fetch(`/api/scan?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to scan URL");
            }

            setScanResults(data);
        } catch (err) {
            console.error("Error scanning URL:", err);
            setError(err.message || "An error occurred while scanning the URL");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                    <Input
                        type="text"
                        placeholder="Enter URL (e.g. example.com)"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={isLoading}
                        className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !url}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Scanning...
                            </>
                        ) : (
                            "Scan URL"
                        )}
                    </Button>
                </div>
            </form>

            {error && (
                <Card className="mt-6 border-red-300">
                    <CardContent className="pt-6 text-red-500">
                        {error}
                    </CardContent>
                </Card>
            )}

            {scanResults && (
                <Card className="mt-6">
                    <CardContent className="pt-6">
                        <h3 className="text-lg font-medium mb-4">Scan Results</h3>
                        <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-[500px] text-sm">
                            {JSON.stringify(scanResults, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}