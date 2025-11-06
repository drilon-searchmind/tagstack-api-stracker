"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import { User, LogOut, LogIn, Home } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { data: session, status } = useSession();

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleSignOut = async () => {
        await signOut({ callbackUrl: "/" });
    };

    return (
        <header className="fixed top-5 left-0 right-0 z-50 w-full border-b backdrop-blur-md bg-white/80 supports-[backdrop-filter]:bg-white/60 max-w-[var(--max-width-desktop)] mx-auto border-gray-200 rounded-md">
            <div className="mx-auto px-4 py-3">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/" className="font-bold text-xl text-gray-900 hover:text-gray-700 transition-colors flex items-center">
                        <Image
                            src="/images/logo/tagstackLogo2NoBG.png"
                            alt="Omnipixel Logo"
                            width={40}
                            height={40}
                            className="mr-1"
                        />
                        Omnipixel
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg">
                            v 0.2 beta
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-4">
                        <Button asChild variant="ghost">
                            <Link href="/">
                                <Home className="w-4 h-4 mr-2" />
                                Scan URL
                            </Link>
                        </Button>

                        {session ? (
                            <>
                                <Button asChild variant="ghost">
                                    <Link href="/dashboard">Dashboard</Link>
                                </Button>

                                {/* User Info */}
                                <div className="flex items-center space-x-3 px-3 py-2 bg-white/50 rounded-lg border border-white/30">
                                    <div className="w-8 h-8 bg-gradient-to-br from-[#192522] to-[#151f1d] rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">
                                        {session.user.firstName || session.user.username}
                                    </span>
                                </div>

                                <Button
                                    variant="ghost"
                                    onClick={handleSignOut}
                                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </Button>
                            </>
                        ) : (
                            <Button asChild variant="ghost">
                                <Link href="/login">
                                    <LogIn className="w-4 h-4 mr-2" />
                                    Sign In
                                </Link>
                            </Button>
                        )}
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? (
                            <FaTimes className="h-5 w-5" />
                        ) : (
                            <FaBars className="h-5 w-5" />
                        )}
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <nav className="md:hidden mt-4 pt-4 border-t border-gray-200 space-y-2">
                        <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <Link href="/">
                                <Home className="w-4 h-4 mr-2" />
                                Scan URL
                            </Link>
                        </Button>

                        {session ? (
                            <>
                                <Button
                                    asChild
                                    variant="ghost"
                                    className="w-full justify-start"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Link href="/dashboard">Dashboard</Link>
                                </Button>

                                {/* Mobile User Info */}
                                <div className="flex items-center space-x-3 px-3 py-2 bg-white/50 rounded-lg border border-white/30 mx-2">
                                    <div className="w-8 h-8 bg-gradient-to-br from-[#192522] to-[#151f1d] rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">
                                            {session.user.firstName || session.user.username}
                                        </p>
                                        <p className="text-xs text-gray-500">{session.user.email}</p>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100 mx-2"
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        handleSignOut();
                                    }}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </Button>
                            </>
                        ) : (
                            <Button
                                asChild
                                variant="ghost"
                                className="w-full justify-start"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <Link href="/login">
                                    <LogIn className="w-4 h-4 mr-2" />
                                    Sign In
                                </Link>
                            </Button>
                        )}
                    </nav>
                )}
            </div>
        </header>
    );
}