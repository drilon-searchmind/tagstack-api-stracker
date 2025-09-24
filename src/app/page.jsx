import CustomScanGTM from "@/components/forms/CustomScanGTM";
import ScanUrlForm from "@/components/forms/ScanUrlForm";

export default function Home() {
	return (
		<main className="flex flex-col items-center justify-start gap-6 max-w-[var(--max-width-desktop)] m-auto w-full px-4">
			<h1 className="text-4xl font-bold">TagStack URL Scanner</h1>
			<p className="text-lg text-center mb-6">
				Enter a URL below to analyze it using the TagStack API
			</p>
			<ScanUrlForm />
			<CustomScanGTM />
		</main>
	);
}