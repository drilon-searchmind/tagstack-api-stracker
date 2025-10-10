async function investigateStapeConfig() {
    console.log('Investigating Stape configuration on pompdelux.dk...');
    
    const testUrls = [
        'https://pompdelux.dk/gtm.js',
        'https://pompdelux.dk/gtag/js',
        'https://pompdelux.dk/analytics.js',
        'https://pompdelux.dk/stape/gtm.js',
        'https://pompdelux.dk/.well-known/gtm',
    ];

    for (const url of testUrls) {
        try {
            console.log(`\nTesting: ${url}`);
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0 GTM-Scanner' }
            });
            
            console.log(`Status: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const content = await response.text();
                console.log(`Content length: ${content.length}`);
                console.log('First 300 chars:', content.substring(0, 300));
                
                const gtmMatches = content.match(/GTM-[A-Z0-9]+/gi);
                if (gtmMatches) {
                    console.log('🎯 GTM IDs found:', gtmMatches);
                }
            }
        } catch (error) {
            console.log(`Error: ${error.message}`);
        }
    }

    console.log('\n--- Checking Shopify App Configuration ---');
    try {
        const response = await fetch('https://pompdelux.dk/', {
            headers: { 'User-Agent': 'Mozilla/5.0 GTM-Scanner' }
        });
        const html = await response.text();
        
        const stapeRefs = html.match(/stape[^"']*|gtm[^"']*/gi);
        console.log('Stape/GTM references:', stapeRefs?.slice(0, 10) || 'None');
        
        const appConfigMatches = html.match(/<script[^>]*>(.*?stape.*?)<\/script>/gis);
        if (appConfigMatches) {
            console.log('App config scripts found:', appConfigMatches.length);
            appConfigMatches.forEach((script, i) => {
                console.log(`Script ${i + 1}:`, script.substring(0, 200) + '...');
            });
        }
        
    } catch (error) {
        console.log('HTML analysis error:', error.message);
    }
}

investigateStapeConfig();