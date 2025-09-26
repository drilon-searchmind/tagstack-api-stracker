import { Fustat } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";

export const metadata = {
    title: "Searchmind Omnipixel URL Scanner",
    description: "Scan URLs using TagStack API",
};

const fustat = Fustat({
    weight: ['200', '300', '400', '500', '600', '700', '800'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-fustat',
});

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={`${fustat.variable} antialiased`}>
                <Header />
                <main className="relative">
                    {children}
                </main>
            </body>
        </html>
    );
}