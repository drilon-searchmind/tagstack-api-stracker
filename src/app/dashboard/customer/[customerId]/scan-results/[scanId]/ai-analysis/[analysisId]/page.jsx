"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Loader2, ArrowLeft, Brain, Target, AlertTriangle, CheckCircle, 
    TrendingUp, Shield, Calendar, Clock, Globe, ExternalLink, 
    Copy, Check, BarChart3, Settings, Users, FileText, Zap, 
    Database, Code, Gauge
} from "lucide-react";

export default function AIAnalysisPage({ params }) {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [scanData, setScanData] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [customerId, setCustomerId] = useState(null);
    const [scanId, setScanId] = useState(null);
    const [analysisId, setAnalysisId] = useState(null);
    const [hasFetched, setHasFetched] = useState(false);
    const [copiedSections, setCopiedSections] = useState({});

    useEffect(() => {
        const initializeParams = async () => {
            const resolvedParams = await params;
            setCustomerId(resolvedParams.customerId);
            setScanId(resolvedParams.scanId);
            setAnalysisId(resolvedParams.analysisId);
        };
        initializeParams();
    }, [params]);

    const fetchAnalysis = useCallback(async () => {
        if (!customerId || !scanId || !analysisId) return;
        
        try {
            setLoading(true);
            
            // Fetch AI analysis
            const analysisResponse = await fetch(`/api/ai-analysis/${analysisId}?customerId=${customerId}&scanId=${scanId}`);
            const analysisResult = await analysisResponse.json();
            
            if (!analysisResponse.ok) {
                throw new Error(analysisResult.error || 'Failed to fetch AI analysis');
            }
            
            setAiAnalysis(analysisResult.analysis);
            setScanData(analysisResult.analysis.scannedUrlId);
            setCustomer(analysisResult.analysis.customerId);
            setHasFetched(true);
        } catch (error) {
            setError(error.message);
            console.error('Error fetching AI analysis:', error);
        } finally {
            setLoading(false);
        }
    }, [customerId, scanId, analysisId]);

    useEffect(() => {
        if (status === "loading" || !customerId || !scanId || !analysisId || hasFetched) return;
        if (!session) {
            router.push("/login");
            return;
        }
        fetchAnalysis();
    }, [session, status, customerId, scanId, analysisId, hasFetched]);

    const copyToClipboard = async (text, sectionId) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedSections(prev => ({ ...prev, [sectionId]: true }));
            setTimeout(() => {
                setCopiedSections(prev => ({ ...prev, [sectionId]: false }));
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const CopyButton = ({ text, sectionId, className = "" }) => (
        <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(text, sectionId)}
            className={`ml-2 ${className}`}
        >
            {copiedSections[sectionId] ? (
                <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied
                </>
            ) : (
                <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                </>
            )}
        </Button>
    );

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRiskLevelColor = (level) => {
        switch (level) {
            case 'low': return 'text-green-800 bg-green-100 border-green-200';
            case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
            case 'high': return 'text-red-800 bg-red-100 border-red-200';
            default: return 'text-gray-800 bg-gray-100 border-gray-200';
        }
    };

    const getComplianceColor = (status) => {
        switch (status) {
            case 'compliant': return 'text-green-800 bg-green-100 border-green-200';
            case 'partial': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
            case 'non-compliant': return 'text-red-800 bg-red-100 border-red-200';
            default: return 'text-gray-800 bg-gray-100 border-gray-200';
        }
    };

    const getMaturityLevelColor = (level) => {
        switch (level) {
            case 'low': return 'text-red-800 bg-red-100 border-red-200';
            case 'medium': return 'text-yellow-800 bg-yellow-100 border-yellow-200';
            case 'high': return 'text-green-800 bg-green-100 border-green-200';
            default: return 'text-gray-800 bg-gray-100 border-gray-200';
        }
    };

    const getMaturityLabel = (level) => {
        switch (level) {
            case 'low': return 'Basic';
            case 'medium': return 'Advanced';
            case 'high': return 'Enterprise';
            default: return 'Unknown';
        }
    };

    if (status === "loading" || loading || !customerId || !scanId || !analysisId) {
        return (
            <div className="login-section min-h-screen flex items-center justify-center">
                <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
                <div className="dots-pattern absolute inset-0 opacity-10"></div>
                <div className="flex items-center space-x-2 relative z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-600" />
                    <span className="text-lg text-gray-700">Loading comprehensive AI analysis...</span>
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
                                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading AI Analysis</h3>
                                <p className="text-gray-600 mb-4">{error}</p>
                                <div className="flex items-center justify-center gap-4">
                                    <Button 
                                        variant="outline"
                                        onClick={() => router.push(`/dashboard/customer/${customerId}/scan-results/${scanId}`)}
                                        className="text-gray-600 hover:text-gray-900"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Back to Scan Results
                                    </Button>
                                    <Button onClick={fetchAnalysis} className="bg-gtm-gradient hover:opacity-90 text-white">
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

    if (!aiAnalysis) {
        return (
            <div className="login-section min-h-screen">
                <div className="absolute inset-0 login-bg-gradient opacity-30"></div>
                <div className="dots-pattern absolute inset-0 opacity-10"></div>
                <div className="max-w-[var(--max-width-desktop)] mx-auto py-8 relative z-10 pt-40">
                    <Card className="border-white/30 shadow-2xl bg-zinc-100">
                        <CardContent className="py-12">
                            <div className="text-center">
                                <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Analysis Not Found</h3>
                                <p className="text-gray-600 mb-4">The AI analysis you're looking for doesn't exist or you don't have access to it.</p>
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
                        onClick={() => router.push(`/dashboard/customer/${customerId}/scan-results/${scanId}`)}
                        className="text-gray-600 hover:text-gray-900 border-gray-300 hover:border-gray-400 hover:bg-white/80"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Scan Results
                    </Button>
                </div>

                {/* Analysis Header */}
                <div className="mb-8">
                    <Card className="glass-morph border-white/30 shadow-2xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center space-x-3 text-2xl text-gray-900">
                                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                        <Brain className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1>Comprehensive Tracking Analysis</h1>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">{formatDate(aiAnalysis.analysisDate)}</span>
                                            <Clock className="w-4 h-4 text-gray-500 ml-4" />
                                            <span className="text-sm text-gray-600">{aiAnalysis.processingTime}ms processing</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 hidden">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getMaturityLevelColor(aiAnalysis.analysisData.riskLevel)}`}>
                                        Maturity: {getMaturityLabel(aiAnalysis.analysisData.riskLevel)}
                                    </span>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-gtm-primary" />
                                    <div>
                                        <div className="text-sm text-gray-600">Website</div>
                                        <div className="font-medium text-gray-900">{customer?.name}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="w-5 h-5 text-gtm-secondary" />
                                    <div>
                                        <div className="text-sm text-gray-600">Scanned URL</div>
                                        <div className="font-medium text-gray-900 truncate">{scanData?.requestedUrl}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-gtm-accent" />
                                    <div>
                                        <div className="text-sm text-gray-600">Compliance</div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getComplianceColor(aiAnalysis.analysisData.complianceStatus)}`}>
                                            {aiAnalysis.analysisData.complianceStatus?.charAt(0).toUpperCase() + aiAnalysis.analysisData.complianceStatus?.slice(1)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Brain className="w-5 h-5 text-purple-500" />
                                    <div>
                                        <div className="text-sm text-gray-600">AI Model</div>
                                        <div className="font-medium text-gray-900">{aiAnalysis.aiModel}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Executive Summary */}
                {aiAnalysis.analysisData.executiveSummary && (
                    <div className="mb-8">
                        <Card className="border-white/30 shadow-2xl bg-gradient-to-br from-purple-50 to-blue-50">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between text-gray-900">
                                    <div className="flex items-center gap-3">
                                        <Users className="w-5 h-5 text-purple-600" />
                                        Executive Summary
                                    </div>
                                    <CopyButton 
                                        text={aiAnalysis.analysisData.executiveSummary} 
                                        sectionId="executive" 
                                        className="border-purple-300 hover:border-purple-400"
                                    />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose prose-sm max-w-none">
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
                                        {aiAnalysis.analysisData.executiveSummary}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Technical Analysis and Platform Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Technical Summary */}
                    <Card className="border-white/30 shadow-2xl bg-zinc-100">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-gray-900">
                                <div className="flex items-center gap-3">
                                    <Code className="w-5 h-5 text-blue-500" />
                                    Technical Analysis
                                </div>
                                <CopyButton 
                                    text={aiAnalysis.analysisData.technicalSummary} 
                                    sectionId="technical" 
                                />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="prose prose-sm max-w-none">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {aiAnalysis.analysisData.technicalSummary}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Platform Analysis */}
                    {aiAnalysis.analysisData.platformAnalysis && (
                        <Card className="border-white/30 shadow-2xl bg-zinc-100">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between text-gray-900">
                                    <div className="flex items-center gap-3">
                                        <Database className="w-5 h-5 text-indigo-500" />
                                        Platform Analysis
                                    </div>
                                    <CopyButton 
                                        text={aiAnalysis.analysisData.platformAnalysis} 
                                        sectionId="platform" 
                                    />
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose prose-sm max-w-none">
                                    <pre className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm font-sans">
                                        {aiAnalysis.analysisData.platformAnalysis}
                                    </pre>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Client Strategy Summary */}
                <div className="mb-8">
                    <Card className="border-white/30 shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-gray-900">
                                <div className="flex items-center gap-3">
                                    <Target className="w-5 h-5 text-green-600" />
                                    Client Strategy Insights
                                </div>
                                <CopyButton 
                                    text={aiAnalysis.analysisData.clientStrategySummary} 
                                    sectionId="strategy" 
                                    className="border-green-300 hover:border-green-400"
                                />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="prose prose-sm max-w-none">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
                                    {aiAnalysis.analysisData.clientStrategySummary}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Key Findings and Recommendations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Key Findings */}
                    <Card className="border-white/30 shadow-2xl bg-zinc-100">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-gray-900">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-purple-500" />
                                    Key Findings
                                </div>
                                <CopyButton 
                                    text={aiAnalysis.analysisData.keyFindings?.join('\n• ') || 'No findings available'} 
                                    sectionId="findings" 
                                />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {aiAnalysis.analysisData.keyFindings?.map((finding, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-purple-600 text-xs font-bold">{index + 1}</span>
                                        </div>
                                        <span className="text-gray-700 leading-relaxed">{finding}</span>
                                    </li>
                                )) || <li className="text-gray-500 italic">No key findings available</li>}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Recommendations */}
                    <Card className="border-white/30 shadow-2xl bg-zinc-100">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-gray-900">
                                <div className="flex items-center gap-3">
                                    <Zap className="w-5 h-5 text-orange-500" />
                                    Recommendations
                                </div>
                                <CopyButton 
                                    text={aiAnalysis.analysisData.recommendations?.join('\n• ') || 'No recommendations available'} 
                                    sectionId="recommendations" 
                                />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-4">
                                {aiAnalysis.analysisData.recommendations?.map((recommendation, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-orange-600 text-xs font-bold">{index + 1}</span>
                                        </div>
                                        <span className="text-gray-700 leading-relaxed">{recommendation}</span>
                                    </li>
                                )) || <li className="text-gray-500 italic">No recommendations available</li>}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Analysis Metadata */}
                <div className="mb-8">
                    <Card className="border-white/30 shadow-xl bg-gray-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-gray-700 text-lg">
                                <FileText className="w-5 h-5" />
                                Analysis Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <Gauge className="w-4 h-4 text-gray-500" />
                                    <div>
                                        <div className="text-gray-500">Processing Time</div>
                                        <div className="font-medium">{aiAnalysis.processingTime}ms</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Brain className="w-4 h-4 text-gray-500" />
                                    <div>
                                        <div className="text-gray-500">AI Model</div>
                                        <div className="font-medium">{aiAnalysis.aiModel}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    <div>
                                        <div className="text-gray-500">Analysis Date</div>
                                        <div className="font-medium">{new Date(aiAnalysis.analysisDate).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-gray-500" />
                                    <div>
                                        <div className="text-gray-500">Status</div>
                                        <div className="font-medium capitalize">{aiAnalysis.analysisStatus}</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}