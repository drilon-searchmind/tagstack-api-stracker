"use client";

import { FaSearch } from "react-icons/fa";

export default function ScanningOverlay({ isVisible }) {
    return (
        <div className={`fixed inset-0 z-50 transition-all duration-700 ease-in-out transform ${
            isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}>
            <div className="absolute inset-0 scanning-overlay-bg opacity-95"></div>
            <div className="dots-pattern absolute inset-0 opacity-10"></div>
            
            <div className="relative z-10 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="mb-8">
                        <div className="relative mx-auto w-32 h-32 mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-gray-300"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-gtm-primary animate-spin"></div>
                            <div className="absolute inset-2 rounded-full border-4 border-transparent border-r-gtm-secondary animate-spin animation-delay-150 reverse-spin"></div>
                            <div className="absolute inset-4 rounded-full border-4 border-transparent border-b-gtm-accent animate-spin animation-delay-300"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <FaSearch className="w-8 h-8 text-gray-600 animate-pulse" />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold text-gray-900 animate-pulse">
                                Scanning Website
                            </h2>
                            <div className="flex items-center justify-center space-x-1">
                                <span className="text-lg text-gray-600">Analyzing GTM containers</span>
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-gtm-primary rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gtm-secondary rounded-full animate-bounce animation-delay-100"></div>
                                    <div className="w-2 h-2 bg-gtm-accent rounded-full animate-bounce animation-delay-200"></div>
                                </div>
                            </div>
                            
                            {/* Progress indicators */}
                            <div className="mt-6 space-y-3">
                                <div className="flex items-center justify-center space-x-3">
                                    <div className="w-3 h-3 bg-gtm-secondary rounded-full animate-pulse"></div>
                                    <span className="text-sm text-gray-600">Detecting GTM containers...</span>
                                </div>
                                <div className="flex items-center justify-center space-x-3">
                                    <div className="w-3 h-3 bg-gtm-accent rounded-full animate-pulse animation-delay-300"></div>
                                    <span className="text-sm text-gray-600">Analyzing tag configurations...</span>
                                </div>
                                <div className="flex items-center justify-center space-x-3">
                                    <div className="w-3 h-3 bg-gtm-primary rounded-full animate-pulse animation-delay-600"></div>
                                    <span className="text-sm text-gray-600">Generating insights...</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="w-80 h-2 bg-gray-200 rounded-full overflow-hidden mx-auto">
                        <div className="h-full bg-gradient-to-r from-gtm-primary via-gtm-secondary to-gtm-accent rounded-full progress-bar-animation">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}