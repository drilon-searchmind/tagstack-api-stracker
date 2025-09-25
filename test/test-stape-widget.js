const { ServerSideGTMDetector } = require('../utils/serverSideGTMDetector');

async function testStapeWidget() {
    console.log('Testing Stape widget extraction...');
    
    const widgetUrl = 'https://cdn.shopify.com/extensions/1c06ce32-d408-497e-9451-51d95cd36322/stape-server-gtm-18/assets/widget.js';
    
    try {
        console.log('Fetching Stape widget:', widgetUrl);
        
        const response = await fetch(widgetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; GTM-Scanner/1.0)',
                'Accept': 'application/javascript, text/javascript, */*'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const content = await response.text();
        console.log('Widget content length:', content.length);
        console.log('First 500 chars:', content.substring(0, 500));
        
        // Look for GTM patterns
        const gtmMatches = content.match(/GTM-[A-Z0-9]+/gi);
        console.log('GTM matches found:', gtmMatches);
        
        // Look for other patterns
        const configPatterns = [
            /container.*id.*['"](GTM-[A-Z0-9]+)['"]/gi,
            /gtm_id['"]\s*:\s*['"](GTM-[A-Z0-9]+)['"]/gi,
            /"GTM-[A-Z0-9]+"/gi,
            /['"]GTM-[A-Z0-9]+['"]/gi
        ];

        for (const pattern of configPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                console.log(`Pattern ${pattern} found matches:`, matches);
            }
        }
        
    } catch (error) {
        console.error('Error fetching widget:', error.message);
    }
}

testStapeWidget();