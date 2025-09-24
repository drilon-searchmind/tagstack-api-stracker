// Function to detect and trace GTM containers
function traceGTMContainers() {
    const results = {
        isGTMPresent: false,
        containerIDs: new Set(),
        detectionMethods: [],
        dataLayerEvents: [],
        scriptsFound: [],
        networkRequests: []
    };

    // Helper: Extract container ID from URL (e.g., gtm.js?id=GTM-XXXX)
    function extractContainerID(url) {
        const match = url.match(/id=(GTM-[A-Z0-9]+)/i);
        return match ? match[1] : null;
    }

    // Check 1: Global google_tag_manager object (standard GTM indicator)
    if (window.google_tag_manager) {
        results.isGTMPresent = true;
        results.detectionMethods.push('Global google_tag_manager object found');
        Object.keys(window.google_tag_manager).forEach(id => {
            if (id.startsWith('GTM-')) {
                results.containerIDs.add(id);
            }
        });
    }

    // Check 2: dataLayer existence and GTM-specific pushes
    if (window.dataLayer && Array.isArray(window.dataLayer)) {
        results.detectionMethods.push('dataLayer array detected');
        window.dataLayer.forEach(item => {
            if (typeof item === 'object') {
                // Look for GTM init events
                if (item['gtm'] && item['gtm'].start) {
                    results.isGTMPresent = true;
                    results.detectionMethods.push('GTM start event in dataLayer');
                }
                if (item.event === 'gtm.js' || item.event === 'gtm.dom' || item.event === 'gtm.load') {
                    results.isGTMPresent = true;
                    results.detectionMethods.push(`GTM event '${item.event}' in dataLayer`);
                }
                // Shopify/Stape-specific events (e.g., custom pixels)
                if (['product_viewed', 'add_to_cart', 'checkout_completed'].includes(item.event)) {
                    results.detectionMethods.push(`E-commerce event '${item.event}' in dataLayer (possible custom pixel/server-side)`);
                }
                results.dataLayerEvents.push(item);
            }
        });
    } else {
        // Fallback: Some setups declare dataLayer later
        results.detectionMethods.push('No dataLayer found (may be declared dynamically)');
    }

    // Check 3: Scan all script tags for GTM patterns (standard or custom domains)
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
        const src = script.src.toLowerCase();
        if (src.includes('gtm.js') || src.includes('gtag/js') || src.includes('/loader.js')) {  // Includes custom loaders
            results.isGTMPresent = true;
            results.detectionMethods.push('GTM-like script tag found');
            results.scriptsFound.push(src);
            const id = extractContainerID(src);
            if (id) results.containerIDs.add(id);
            if (!src.includes('googletagmanager.com')) {
                results.detectionMethods.push('Custom domain/loader detected (server-side indicator)');
            }
        }
    });

    // Check 4: Monitor dynamic injections (e.g., app embeds, custom pixels)
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'SCRIPT' && node.src) {
                        const src = node.src.toLowerCase();
                        if (src.includes('gtm.js') || src.includes('gtag/js') || src.includes('/loader.js')) {
                            results.isGTMPresent = true;
                            results.detectionMethods.push('Dynamically injected GTM-like script');
                            results.scriptsFound.push(src);
                            const id = extractContainerID(src);
                            if (id) results.containerIDs.add(id);
                        }
                    }
                });
            }
        });
    });
    observer.observe(document.head || document.documentElement, { childList: true, subtree: true });
    results.detectionMethods.push('MutationObserver monitoring for dynamic injections');

    // Check 5: Network requests (using Performance API for loaded resources)
    if (performance && performance.getEntriesByType) {
        const entries = performance.getEntriesByType('resource');
        entries.forEach(entry => {
            const url = entry.name.toLowerCase();
            if (url.includes('gtm.js') || url.includes('collect') || url.includes('gtag/js') || url.includes('/loader.js')) {
                results.isGTMPresent = true;
                results.detectionMethods.push('GTM-like network request');
                results.networkRequests.push(url);
                const id = extractContainerID(url);
                if (id) results.containerIDs.add(id);
                if (!url.includes('googletagmanager.com')) {
                    results.detectionMethods.push('Custom domain request (server-side indicator)');
                }
            }
        });
    }

    // Log results
    console.log('GTM Trace Results:', results);
    return results;
}

// Run the tracer
traceGTMContainers();

// Optional: To stop observer after a timeout (e.g., 10 seconds)
setTimeout(() => observer.disconnect(), 10000);