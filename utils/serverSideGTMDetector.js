const { JSDOM } = require('jsdom');

/**
 * Server-side GTM container detection - Vercel compatible
 * Uses puppeteer-core + @sparticuz/chromium for Vercel deployment
 */

class ServerSideGTMDetector {
    constructor() {
        this.containerIdRegex = /\b(GTM-[A-Z0-9-_]+)\b/gi;
        this.measurementIdRegex = /\b(G-[A-Z0-9-_]+)\b/gi;
        this.analyticsIdRegex = /\b(UA-[0-9]+-[0-9]+)\b/gi;
        this.gtmScriptPatterns = [
            /gtm\.js/i,
            /gtag\/js/i,
            /googletagmanager\.com/i,
            /\/loader\.js/i
        ];
    }

    async detectGTMContainers(url, useBrowserDetection = true) {
        const results = {
            isGTMPresent: false,
            containerIDs: new Set(),
            detectionMethods: [],
            dataLayerEvents: [],
            scriptsFound: [],
            networkRequests: [],
            url: url,
            scannedAt: new Date().toISOString()
        };

        try {
            // Try browser-based detection first for dynamic content
            if (useBrowserDetection) {
                const browserResults = await this.detectWithBrowser(url);
                if (browserResults.containerIDs.length > 0) {
                    return browserResults;
                }
                // Merge browser results with server-side results
                results.detectionMethods.push(...browserResults.detectionMethods);
                results.networkRequests = browserResults.networkRequests;
            }

            const htmlContent = await this.fetchPageContent(url);
            if (!htmlContent) {
                throw new Error('Failed to fetch page content');
            }

            const dom = new JSDOM(htmlContent, {
                features: {
                    ProcessExternalResources: false,
                    FetchExternalResources: false
                }
            });
            const document = dom.window.document;

            this.detectFromScriptTags(document, results);
            this.detectFromInlineScripts(document, results);
            this.detectFromDataLayer(htmlContent, results);
            this.detectFromMetaTags(document, results);
            this.extractAdditionalIds(htmlContent, results);
            
            await this.detectDynamicGTM(url, htmlContent, results);
            await this.detectShopifyGTM(document, htmlContent, results);
            await this.detectStapeGTM(url, htmlContent, results);
            
            const allContainerIds = Array.from(results.containerIDs);
            const validGTMIds = allContainerIds.filter(id => {
                return /^GTM-[A-Z0-9]+$/.test(id);
            });
            
            if (results.isGTMPresent && validGTMIds.length === 0) {
                await this.detectServerSideGTMAlternatives(url, htmlContent, results);
            }
            
            const finalContainerIds = Array.from(results.containerIDs);
            const finalValidGTMIds = finalContainerIds.filter(id => {
                return /^GTM-[A-Z0-9]+$/.test(id); 
            });
            results.containerIDs = finalValidGTMIds;
            
            return results;
        } catch (error) {
            return {
                ...results,
                error: error.message,
                containerIDs: Array.from(results.containerIDs)
            };
        }
    }

    async detectWithBrowser(url) {
        const results = {
            isGTMPresent: false,
            containerIDs: [],
            detectionMethods: [],
            dataLayerEvents: [],
            scriptsFound: [],
            networkRequests: [],
            url: url,
            scannedAt: new Date().toISOString()
        };

        let browser;
        try {
            results.detectionMethods.push('Starting browser-based dynamic detection');
            
            // Vercel-compatible Puppeteer setup
            const isVercel = !!process.env.VERCEL_ENV;
            let puppeteer;
            let launchOptions = {
                headless: true,
            };

            if (isVercel) {
                results.detectionMethods.push('Running on Vercel - using @sparticuz/chromium');
                const chromium = (await import('@sparticuz/chromium')).default;
                puppeteer = await import('puppeteer-core');
                launchOptions = {
                    ...launchOptions,
                    args: chromium.args,
                    executablePath: await chromium.executablePath(),
                };
            } else {
                results.detectionMethods.push('Running locally - using standard puppeteer');
                puppeteer = await import('puppeteer');
            }
            
            browser = await puppeteer.launch(launchOptions);
            const page = await browser.newPage();
            
            // Set up network request monitoring
            const networkRequests = [];
            page.on('request', (request) => {
                networkRequests.push({
                    url: request.url(),
                    method: request.method(),
                    resourceType: request.resourceType()
                });
            });

            // Set up response monitoring for Stape widgets
            page.on('response', async (response) => {
                const responseUrl = response.url();
                
                // Check if this is a Stape widget configuration request
                if (responseUrl.includes('stapecdn.com/widget')) {
                    try {
                        results.detectionMethods.push(`Found Stape config request: ${responseUrl}`);
                        
                        const configData = await response.json();
                        if (configData?.generate?.gtm_id) {
                            const gtmId = configData.generate.gtm_id;
                            if (/^GTM-[A-Z0-9]+$/.test(gtmId)) {
                                results.containerIDs.push(gtmId);
                                results.detectionMethods.push(`✓ GTM container from browser detection: ${gtmId}`);
                                results.isGTMPresent = true;
                            }
                        }
                    } catch (e) {
                        results.detectionMethods.push(`Stape config parse error: ${e.message}`);
                    }
                }
            });

            // Navigate to the page
            await page.goto(url, { 
                waitUntil: 'networkidle2', // Wait for network to be idle for 500ms
                timeout: 30000 
            });

            // Wait a bit longer for dynamic content to load
            await page.waitForTimeout(3000);

            // Check for GTM in the final DOM
            const pageGTMIds = await page.evaluate(() => {
                const gtmPattern = /GTM-[A-Z0-9]+/gi;
                const bodyText = document.body.innerHTML;
                const matches = bodyText.match(gtmPattern);
                return matches ? [...new Set(matches)] : [];
            });

            if (pageGTMIds.length > 0) {
                results.containerIDs.push(...pageGTMIds);
                results.detectionMethods.push(`GTM IDs found in final DOM: ${pageGTMIds.join(', ')}`);
                results.isGTMPresent = true;
            }

            // Store network requests for analysis
            results.networkRequests = networkRequests.filter(req => 
                req.url.includes('gtm') || 
                req.url.includes('analytics') || 
                req.url.includes('stape')
            );

            results.detectionMethods.push(`Browser scan completed. Found ${results.containerIDs.length} containers.`);

        } catch (error) {
            results.detectionMethods.push(`Browser detection error: ${error.message}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }

        return results;
    }

    async fetchPageContent(url) {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; GTM-Scanner/1.0) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
            },
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
    }

    detectFromScriptTags(document, results) {
        const scripts = document.querySelectorAll('script[src]');
        
        scripts.forEach(script => {
            const src = script.src;
            if (!src) return;

            const srcLower = src.toLowerCase();
            
            const isGTMScript = this.gtmScriptPatterns.some(pattern => pattern.test(srcLower));
            
            if (isGTMScript) {
                results.isGTMPresent = true;
                results.detectionMethods.push('GTM script tag found');
                results.scriptsFound.push(src);

                const containerId = this.extractContainerIdFromUrl(src);
                if (containerId) {
                    results.containerIDs.add(containerId);
                }

                if (!srcLower.includes('googletagmanager.com')) {
                    results.detectionMethods.push('Custom domain GTM script (server-side indicator)');
                }
            }
        });
    }

    detectFromInlineScripts(document, results) {
        const scripts = document.querySelectorAll('script:not([src])');
        
        scripts.forEach(script => {
            const content = script.textContent || script.innerHTML;
            if (!content) return;

            if (content.includes('google_tag_manager') || content.includes('googletagmanager.com')) {
                results.isGTMPresent = true;
                results.detectionMethods.push('GTM initialization in inline script');
            }

            if (content.includes('gtag(') || content.includes('ga(')) {
                results.isGTMPresent = true;
                results.detectionMethods.push('Google Analytics/gtag function calls');
            }

            const containerMatches = content.match(this.containerIdRegex);
            if (containerMatches) {
                containerMatches.forEach(id => {
                    results.containerIDs.add(id);
                    results.detectionMethods.push(`Container ID found in inline script: ${id}`);
                });
            }
        });
    }

    detectFromDataLayer(htmlContent, results) {
        const dataLayerMatches = htmlContent.match(/dataLayer\s*=\s*(\[.*?\])/gs);
        
        if (dataLayerMatches) {
            results.detectionMethods.push('dataLayer initialization found');
            
            dataLayerMatches.forEach(match => {
                try {
                    const arrayMatch = match.match(/\[(.*?)\]/s);
                    if (arrayMatch) {
                        const arrayContent = `[${arrayMatch[1]}]`;
                        if (arrayContent.includes('gtm.js') || arrayContent.includes('gtm.dom') || arrayContent.includes('gtm.load')) {
                            results.isGTMPresent = true;
                            results.detectionMethods.push('GTM events found in dataLayer');
                        }
                        
                        const ecommerceEvents = ['product_viewed', 'add_to_cart', 'checkout_completed', 'purchase'];
                        if (ecommerceEvents.some(event => arrayContent.includes(event))) {
                            results.detectionMethods.push('E-commerce events in dataLayer (possible custom pixel/server-side)');
                        }
                    }
                } catch (e) {
                }
            });
        }

        if (htmlContent.includes('dataLayer.push') || htmlContent.includes('window.dataLayer')) {
            results.detectionMethods.push('dataLayer.push calls detected');
        }
    }

    detectFromMetaTags(document, results) {
        const metaTags = document.querySelectorAll('meta[name*="google"], meta[property*="google"]');
        
        metaTags.forEach(meta => {
            const name = meta.getAttribute('name') || meta.getAttribute('property') || '';
            const content = meta.getAttribute('content') || '';
            
            if (name.toLowerCase().includes('google') || content.match(this.containerIdRegex)) {
                results.detectionMethods.push('Google-related meta tag found');
                
                const containerMatches = content.match(this.containerIdRegex);
                if (containerMatches) {
                    containerMatches.forEach(id => results.containerIDs.add(id));
                }
            }
        });
    }

    extractAdditionalIds(htmlContent, results) {
        const allMatches = htmlContent.match(this.containerIdRegex);
        
        if (allMatches) {
            const uniqueMatches = [...new Set(allMatches)];
            uniqueMatches.forEach(id => {
                results.containerIDs.add(id);
            });
            
            if (uniqueMatches.length > 0) {
                results.detectionMethods.push(`Additional container IDs found: ${uniqueMatches.join(', ')}`);
            }
        }
    }

    extractContainerIdFromUrl(url) {
        const match = url.match(/[?&]id=(GTM-[A-Z0-9-_]+)/i);
        return match ? match[1] : null;
    }

    async detectDynamicGTM(url, htmlContent, results) {
        const dynamicPatterns = [
            /gtag\s*\(\s*['"]config['"],\s*['"]GTM-[A-Z0-9-_]+['"]/gi,
            /gtag\s*\(\s*['"]js['"],\s*new\s+Date\(\)/gi,
            /google_tag_manager\s*\[\s*['"]GTM-[A-Z0-9-_]+['"]/gi,
            /window\.gtag\s*=/gi,
            /ga\s*\(\s*['"]create['"],\s*['"]GTM-[A-Z0-9-_]+['"]/gi
        ];

        for (const pattern of dynamicPatterns) {
            const matches = htmlContent.match(pattern);
            if (matches) {
                results.isGTMPresent = true;
                results.detectionMethods.push('Dynamic GTM loading pattern detected');
                
                matches.forEach(match => {
                    const containerMatch = match.match(/GTM-[A-Z0-9-_]+/i);
                    if (containerMatch) {
                        results.containerIDs.add(containerMatch[0]);
                    }
                });
            }
        }
    }

    async detectShopifyGTM(document, htmlContent, results) {
        const isShopify = htmlContent.includes('Shopify.shop') || 
                         htmlContent.includes('cdn.shopify.com') ||
                         htmlContent.includes('shopify.com/s/files') ||
                         document.querySelector('[data-shopify]') ||
                         htmlContent.includes('Shopify.theme');

        if (!isShopify) return;

        results.detectionMethods.push('Shopify site detected - checking for GTM');

        const shopifyGTMPatterns = [
            /checkout_completed|add_to_cart|product_viewed|purchase|begin_checkout/gi,
            /Shopify\.analytics\.publish/gi,
            /analytics\.track/gi,
            /window\.analytics/gi
        ];

        for (const pattern of shopifyGTMPatterns) {
            if (pattern.test(htmlContent)) {
                results.isGTMPresent = true;
                results.detectionMethods.push('Shopify analytics/tracking detected (likely GTM-powered)');
                break;
            }
        }

        const shopifyAppPatterns = [
            /gtm\.start/gi,
            /dataLayer\.push.*event.*gtm/gi,
            /google-analytics\.com\/analytics\.js/gi
        ];

        for (const pattern of shopifyAppPatterns) {
            if (pattern.test(htmlContent)) {
                results.isGTMPresent = true;
                results.detectionMethods.push('Shopify app GTM integration detected');
                break;
            }
        }

        if (isShopify) {
            const potentialGTMScripts = htmlContent.match(/src=["'][^"']*(?:gtm|analytics|tracking)[^"']*["']/gi);
            if (potentialGTMScripts && potentialGTMScripts.length > 0) {
                results.isGTMPresent = true;
                results.detectionMethods.push('Shopify dynamic GTM loading scripts detected');
                results.scriptsFound.push(...potentialGTMScripts);
            }

            if (htmlContent.includes('Shopify.analytics') || htmlContent.includes('checkout_completed') || 
                htmlContent.includes('add_to_cart') || htmlContent.includes('product_viewed')) {
                results.isGTMPresent = true;
                results.detectionMethods.push('Shopify e-commerce tracking detected (indicates GTM/GA presence)');
                
                results.detectionMethods.push('Note: Actual GTM container ID may be loaded dynamically by Shopify apps');
            }
        }
    }

    async detectStapeGTM(url, htmlContent, results) {
        try {
            // First, look for any Stape widget scripts in the initial HTML
            const stapeScriptMatch = htmlContent.match(/src=["'][^"']*stape-server-gtm-[^"']*widget\.js[^"']*["']/gi);
            if (stapeScriptMatch) {
                results.isGTMPresent = true;
                results.detectionMethods.push('Stape server-side GTM widget detected');
                
                // ...existing widget processing code...
            }

            // NEW: Try to detect Stape by constructing configuration URLs from domain
            await this.detectStapeByDomain(url, htmlContent, results);

            // ...existing code for other Stape detection methods...
        } catch (error) {
            results.detectionMethods.push('Stape detection error (continuing with other methods)');
        }
    }

    async detectStapeByDomain(url, htmlContent, results) {
        try {
            // Look for ANY stapecdn.com/widget references in the HTML content
            const stapeWidgetRefs = htmlContent.match(/https?:\/\/[^"'\s]*stapecdn\.com\/widget\/[^"'\s]*/gi);
            
            if (stapeWidgetRefs && stapeWidgetRefs.length > 0) {
                results.detectionMethods.push(`Found ${stapeWidgetRefs.length} Stape widget reference(s) in HTML`);
                
                for (const configUrl of stapeWidgetRefs) {
                    try {
                        results.detectionMethods.push(`Fetching Stape config from HTML: ${configUrl}`);
                        
                        const configResponse = await fetch(configUrl, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (compatible; GTM-Scanner/1.0)',
                                'Accept': 'application/json, */*'
                            },
                            timeout: 8000
                        });

                        if (configResponse.ok) {
                            const configData = await configResponse.json();
                            
                            if (configData?.generate?.gtm_id) {
                                const gtmId = configData.generate.gtm_id;
                                if (/^GTM-[A-Z0-9]+$/.test(gtmId)) {
                                    results.containerIDs.add(gtmId);
                                    results.detectionMethods.push(`✓ GTM container found from Stape widget: ${gtmId}`);
                                    results.isGTMPresent = true;
                                    
                                    if (configData.generate.custom_domain) {
                                        results.detectionMethods.push(`Stape custom domain: ${configData.generate.custom_domain}`);
                                    }
                                    
                                    return; // Found GTM ID, exit successfully
                                }
                            }
                        } else {
                            results.detectionMethods.push(`Config fetch failed: ${configResponse.status}`);
                        }
                    } catch (configError) {
                        results.detectionMethods.push(`Config error: ${configError.message}`);
                    }
                }
            }
            
            // Also look for stapecdn references that might not be complete URLs
            const partialStapeRefs = htmlContent.match(/stapecdn\.com\/widget\/[^"'\s]*/gi);
            
            if (partialStapeRefs && partialStapeRefs.length > 0) {
                results.detectionMethods.push(`Found ${partialStapeRefs.length} partial Stape reference(s)`);
                
                for (const partialRef of partialStapeRefs) {
                    try {
                        const fullUrl = partialRef.startsWith('http') ? partialRef : `https://${partialRef}`;
                        results.detectionMethods.push(`Trying partial Stape ref: ${fullUrl}`);
                        
                        const configResponse = await fetch(fullUrl, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (compatible; GTM-Scanner/1.0)',
                                'Accept': 'application/json, */*'
                            },
                            timeout: 8000
                        });

                        if (configResponse.ok) {
                            const configData = await configResponse.json();
                            
                            if (configData?.generate?.gtm_id) {
                                const gtmId = configData.generate.gtm_id;
                                if (/^GTM-[A-Z0-9]+$/.test(gtmId)) {
                                    results.containerIDs.add(gtmId);
                                    results.detectionMethods.push(`✓ GTM container from partial ref: ${gtmId}`);
                                    results.isGTMPresent = true;
                                    return;
                                }
                            }
                        }
                    } catch (e) {
                        // Continue with other references
                    }
                }
            }
            
            // If no direct references found, look for any Stape indicators and note them
            const stapeIndicators = [
                htmlContent.match(/sgtm\.([a-zA-Z0-9.-]+)/gi), // Server GTM domains
                htmlContent.match(/stape[a-zA-Z0-9.-]*\.com/gi), // Any Stape domains
                htmlContent.match(/gtm-server[a-zA-Z0-9.-]*/gi) // GTM server references
            ];
            
            for (const indicators of stapeIndicators) {
                if (indicators) {
                    results.detectionMethods.push(`Found Stape indicators: ${indicators.join(', ')}`);
                }
            }
            
        } catch (error) {
            results.detectionMethods.push(`Stape widget detection error: ${error.message}`);
        }
    }

    async extractGTMFromStapeWidget(widgetUrl, results) {
        try {
            results.detectionMethods.push(`Fetching Stape widget: ${widgetUrl.substring(0, 50)}...`);
            
            const response = await fetch(widgetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; GTM-Scanner/1.0)',
                    'Accept': 'application/javascript, text/javascript, */*'
                },
                timeout: 10000
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const widgetContent = await response.text();
            
            const gtmMatches = widgetContent.match(/GTM-[A-Z0-9]+/gi);
            if (gtmMatches && gtmMatches.length > 0) {
                const uniqueGTMIds = [...new Set(gtmMatches)];
                uniqueGTMIds.forEach(id => {
                    results.containerIDs.add(id);
                });
                results.detectionMethods.push(`Real GTM container ID extracted from Stape widget: ${uniqueGTMIds.join(', ')}`);
                results.scriptsFound.push(widgetUrl);
                return true;
            }

            const configPatterns = [
                /container.*id.*['"](GTM-[A-Z0-9]+)['"]/gi,
                /gtm_id['"]\s*:\s*['"](GTM-[A-Z0-9]+)['"]/gi,
                /"GTM-[A-Z0-9]+"/gi
            ];

            for (const pattern of configPatterns) {
                const matches = widgetContent.match(pattern);
                if (matches) {
                    matches.forEach(match => {
                        const containerMatch = match.match(/GTM-[A-Z0-9]+/i);
                        if (containerMatch) {
                            results.containerIDs.add(containerMatch[0]);
                            results.detectionMethods.push(`GTM container found in Stape config: ${containerMatch[0]}`);
                        }
                    });
                }
            }

        } catch (error) {
            results.detectionMethods.push(`Stape widget extraction failed: ${error.message}`);
        }
    }

    async detectServerSideGTMAlternatives(url, htmlContent, results) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;

            // Check for stapecdn.com/widget pattern and extract shop information
            const stapeWidgetMatch = htmlContent.match(/stapecdn\.com\/widget\/setting\?shop=([^&"']+)(?:&shop_id=([^&"']+))?/gi);
            if (stapeWidgetMatch) {
                results.detectionMethods.push('Stape widget configuration endpoint detected');
                
                for (const widgetMatch of stapeWidgetMatch) {
                    try {
                        const fullUrl = widgetMatch.startsWith('http') ? widgetMatch : `https://${widgetMatch}`;
                        results.detectionMethods.push(`Fetching Stape config: ${fullUrl}`);
                        
                        const response = await fetch(fullUrl, {
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (compatible; GTM-Scanner/1.0)',
                                'Accept': 'application/json, */*'
                            },
                            timeout: 10000
                        });

                        if (response.ok) {
                            const configData = await response.json();
                            
                            // Extract GTM ID from the configuration
                            if (configData?.generate?.gtm_id) {
                                const gtmId = configData.generate.gtm_id;
                                if (/^GTM-[A-Z0-9]+$/.test(gtmId)) {
                                    results.containerIDs.add(gtmId);
                                    results.detectionMethods.push(`GTM container extracted from Stape config: ${gtmId}`);
                                    
                                    // Also extract custom domain if available
                                    if (configData.generate.custom_domain) {
                                        results.detectionMethods.push(`Stape custom domain: ${configData.generate.custom_domain}`);
                                    }
                                    
                                    return; // Found container, stop searching
                                }
                            }
                        }
                    } catch (e) {
                        results.detectionMethods.push(`Stape config fetch failed: ${e.message}`);
                    }
                }
            }

            // Look for stapecdn.com/widget references in scripts and try to construct the config URL
            const stapeReferences = htmlContent.match(/stapecdn\.com[^"']*widget[^"']*/gi);
            if (stapeReferences) {
                results.detectionMethods.push('Stape widget references found, attempting to extract shop info');
                
                // Try to extract shop information from the page to construct config URL
                const shopifyShopMatch = htmlContent.match(/shop['"]\s*:\s*['"]([^'"]+)['"]/gi) || 
                                       htmlContent.match(/Shopify\.shop\s*=\s*['"]([^'"]+)['"]/gi);
                
                if (shopifyShopMatch) {
                    for (const shopMatch of shopifyShopMatch) {
                        try {
                            const shopName = shopMatch.match(/['"]([^'"]+)['"]/)[1];
                            if (shopName && shopName.includes('.')) {
                                const configUrl = `https://sp.stapecdn.com/widget/setting?shop=${shopName}`;
                                results.detectionMethods.push(`Attempting Stape config fetch: ${configUrl}`);
                                
                                const response = await fetch(configUrl, {
                                    headers: {
                                        'User-Agent': 'Mozilla/5.0 (compatible; GTM-Scanner/1.0)',
                                        'Accept': 'application/json, */*'
                                    },
                                    timeout: 10000
                                });

                                if (response.ok) {
                                    const configData = await response.json();
                                    if (configData?.generate?.gtm_id) {
                                        const gtmId = configData.generate.gtm_id;
                                        if (/^GTM-[A-Z0-9]+$/.test(gtmId)) {
                                            results.containerIDs.add(gtmId);
                                            results.detectionMethods.push(`GTM container extracted from constructed Stape config: ${gtmId}`);
                                            return;
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // Continue with next shop match
                        }
                    }
                }
            }

            const stapeAppMatch = htmlContent.match(/stape-server-gtm-(\d+)/);
            if (stapeAppMatch) {
                const stapeId = stapeAppMatch[1];
                
                const stapeEndpoints = [
                    `/gtm.js?id=stape-${stapeId}`,
                    `/gtag/js?id=stape-${stapeId}`,
                    `/analytics.js`,
                    `/gtm/gtm.js`,
                    `/stape/gtm.js`
                ];

                for (const endpoint of stapeEndpoints) {
                    try {
                        const testUrl = `${urlObj.protocol}//${domain}${endpoint}`;
                        const response = await fetch(testUrl, { 
                            timeout: 5000,
                            headers: { 'User-Agent': 'Mozilla/5.0 GTM-Scanner' }
                        });
                        
                        if (response.ok) {
                            results.detectionMethods.push(`Server-side GTM endpoint found: ${endpoint}`);
                            
                            try {
                                const content = await response.text();
                                const gtmIds = content.match(/GTM-[A-Z0-9]+/gi);
                                if (gtmIds) {
                                    const uniqueIds = [...new Set(gtmIds)];
                                    uniqueIds.forEach(id => results.containerIDs.add(id));
                                    results.detectionMethods.push(`GTM containers from server endpoint: ${uniqueIds.join(', ')}`);
                                    return; // Found containers, stop searching
                                }
                            } catch (e) {
                                // TODO: Log fetch errors if needed
                            }
                        }
                    } catch (e) {
                        // TODO: Log fetch errors if needed
                    }
                }
            }

            const stapeBlockMatch = htmlContent.match(/stape-server-gtm\/blocks\/gtm\/([a-f0-9-]+)/);
            if (stapeBlockMatch) {
                const blockId = stapeBlockMatch[1];
                results.detectionMethods.push(`Stape GTM block found: ${blockId}`);
                
                results.detectionMethods.push('Server-side GTM container detected - ID loaded dynamically at runtime');
            }

            // Check for structured data containing GTM references
            const jsonLdMatches = htmlContent.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis);
            if (jsonLdMatches) {
                for (const jsonLdMatch of jsonLdMatches) {
                    try {
                        const jsonContent = jsonLdMatch.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
                        const gtmRefs = jsonContent.match(/GTM-[A-Z0-9]+/gi);
                        if (gtmRefs) {
                            gtmRefs.forEach(id => results.containerIDs.add(id));
                            results.detectionMethods.push('GTM container found in structured data');
                        }
                    } catch (e) {
                    }
                }
            }

        } catch (error) {
        }
    }
}

module.exports = { ServerSideGTMDetector };