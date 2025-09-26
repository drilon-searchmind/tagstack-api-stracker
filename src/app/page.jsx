import ScanUrlForm from "@/components/forms/ScanUrlForm";

export default function Home() {
	return (
		<>
			<section className="hero-section min-h-screen flex flex-col items-center justify-center relative overflow-hidden pb-20">
				<div className="absolute inset-0 bg-gtm-gradient opacity-90"></div>
				<div className="dots-pattern absolute inset-0 opacity-20"></div>

				<div className="relative z-10 flex flex-col items-center justify-center text-center px-4 w-full max-w-[var(--max-width-desktop)]">
					<div className="mb-12">
						<h1 className="text-5xl md:text-5xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
							<span className="block">Searchmind</span>
							<span className="block text-white/90">Omnipixel</span>
							<span className="block text-3xl md:text-4xl lg:text-4xl font-light text-white/80">
								GTM Scanner
							</span>
						</h1>
						<p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed">
							Analyze your website's marketing tags and GTM containers with our powerful TagStack API integration
						</p>
					</div>

					<div className="w-full max-w-[var(--max-width-desktop)]">
						<ScanUrlForm />
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-5xl hidden">
						<div className="glass-morph p-6 rounded-lg text-center">
							<div className="text-3xl mb-4">🔍</div>
							<h3 className="text-lg font-semibold text-white mb-2">Deep Analysis</h3>
							<p className="text-white/80 text-sm">
								Comprehensive scanning of GTM containers, tags, and marketing technologies
							</p>
						</div>
						<div className="glass-morph p-6 rounded-lg text-center">
							<div className="text-3xl mb-4">⚡</div>
							<h3 className="text-lg font-semibold text-white mb-2">Real-time Results</h3>
							<p className="text-white/80 text-sm">
								Instant analysis with detailed breakdowns by marketing channel
							</p>
						</div>
						<div className="glass-morph p-6 rounded-lg text-center">
							<div className="text-3xl mb-4">📊</div>
							<h3 className="text-lg font-semibold text-white mb-2">Detailed Reports</h3>
							<p className="text-white/80 text-sm">
								GA4, Meta, Google Ads, and other marketing technology insights
							</p>
						</div>
					</div>
				</div>

				<div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce hidden">
					<div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
						<div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
					</div>
				</div>
			</section>

			<section className="py-0 bg-background">
				<div className="max-w-[var(--max-width-desktop)] mx-auto px-4">
				</div>
			</section>
		</>
	);
}