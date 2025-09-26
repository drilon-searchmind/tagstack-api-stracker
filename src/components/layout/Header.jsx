"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import Image from "next/image";


export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <header className="fixed top-5 left-0 right-0 z-50 w-full border-b backdrop-blur-md bg-white/80 supports-[backdrop-filter]:bg-white/60 max-w-[var(--max-width-desktop)] mx-auto border-gray-200 rounded-md">
            <div className=" mx-auto px-4 py-3">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <>

                        <Link href="/" className="font-bold text-xl text-gray-900 hover:text-gray-700 transition-colors flex items-center">
                            <Image
                                src="/images/logo/tagstackLogo2NoBG.png"
                                alt="Omnipixel Logo"
                                width={40}
                                height={40}
                                className="mr-1"
                            />
                            Omnipixel
                        </Link>
                    </>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex space-x-4">
                        <Button asChild variant="ghost">
                            <Link href="/">Home</Link>
                        </Button>
                        <Button asChild variant="ghost">
                            <Link href="#">Scan URL</Link>
                        </Button>
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
                            <Link href="/">Home</Link>
                        </Button>
                        <Button
                            asChild
                            variant="ghost"
                            className="w-full justify-start"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <Link href="#">Scan URL</Link>
                        </Button>
                    </nav>
                )}
            </div>
        </header>
    );
}