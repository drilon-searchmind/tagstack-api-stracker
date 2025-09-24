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
    const [gtmContainers, setGtmContainers] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!url) return;

        setIsLoading(true);
        setError(null);
        setScanResults(null);
        setGtmContainers([]);

        try {
            const respGtm = await fetch(`/api/gtm-scan-id?url=${encodeURIComponent(url)}`);
            const gtmJson = await respGtm.json();
            if (!respGtm.ok) throw new Error(gtmJson.message || gtmJson.error || JSON.stringify(gtmJson));

            const containers = Array.isArray(gtmJson.containers)
                ? gtmJson.containers.filter(c => c && typeof c.id === 'string' && /^GTM-[A-Z0-9]+$/.test(c.id))
                : [];

            setGtmContainers(containers);

            const scans = await Promise.allSettled(
                containers.map(ct => fetch(`/api/scan?url=${encodeURIComponent(ct.id)}`))
            );

            const containerScans = await Promise.all(
                scans.map(async (s, idx) => {
                    const id = containers[idx]?.id || null;
                    if (s.status === "fulfilled") {
                        try {
                            const res = s.value;
                            const body = await res.json().catch(() => null);
                            return { id, ok: res.ok, status: res.status, body };
                        } catch (err) {
                            return { id, ok: false, error: String(err) };
                        }
                    } else {
                        return { id, ok: false, error: String(s.reason) };
                    }
                })
            );

            setScanResults({
                requestedUrl: url,
                gtmScan: gtmJson,
                containers,
                containerScans
            });
        } catch (err) {
            console.error("Error scanning URL:", err);
            setError(err.message || String(err));
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

                        <h4 className="font-medium">Detected GTM Containers</h4>
                        <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-[160px] text-sm">
                            {JSON.stringify(gtmContainers, null, 2)}
                        </pre>

                        <h4 className="font-medium mt-4">Per-container TagStack Scan Results</h4>
                        <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-[500px] text-sm">
                            {JSON.stringify(scanResults.containerScans, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}