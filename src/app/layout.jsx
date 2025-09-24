import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
	title: "TagStack URL Scanner",
	description: "Scan URLs using TagStack API",
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<div className="min-h-screen flex flex-col">
					<Header />
					<main className="flex-1 py-20">
						{children}
					</main>
				</div>
			</body>
		</html>
	);
}