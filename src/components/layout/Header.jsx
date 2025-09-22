import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Header() {
    return (
        <header className="border-b bg-background px-4 py-3">
            <div className="flex justify-between items-center max-w-[var(--max-width-desktop)] m-auto">
                <Link href="/" className="font-bold text-xl">
                    TagStack Scanner
                </Link>
                <nav className="space-x-4">
                    <Button asChild variant="ghost">
                        <Link href="/">Home</Link>
                    </Button>
                    <Button asChild variant="ghost">
                        <Link href="/scan">Scan URL</Link>
                    </Button>
                </nav>
            </div>
        </header>
    );
}