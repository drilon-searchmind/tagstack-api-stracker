const { ServerSideGTMDetector } = require('../utils/serverSideGTMDetector');

async function testPompdelux() {
    console.log('Testing pompdelux.dk...');
    
    const detector = new ServerSideGTMDetector();
    
    try {
        const result = await detector.detectGTMContainers('https://pompdelux.dk/');
        
        console.log('\n=== POMPDELUX.DK RESULTS ===');
        console.log('GTM Present:', result.isGTMPresent);
        console.log('Container IDs:', result.containerIDs);
        console.log('Detection methods:', result.detectionMethods);
        console.log('Scripts found:', result.scriptsFound.length);
        console.log('Network requests:', result.networkRequests.length);
        
        console.log('\n=== FETCHING HTML FOR ANALYSIS ===');
        const response = await fetch('https://pompdelux.dk/');
        const html = await response.text();
        
        const gtmMatches = html.match(/GTM-[A-Z0-9-_]+/gi) || [];
        const gtmScripts = html.match(/googletagmanager\.com[^"']*|gtm\.js[^"']*/gi) || [];
        const dataLayerRefs = html.match(/dataLayer[^"']*[.push()]*[^"']*/gi) || [];
        
        console.log('Direct GTM IDs in HTML:', gtmMatches);
        console.log('GTM script references:', gtmScripts);  
        console.log('DataLayer references found:', dataLayerRefs.length);
        
        if (result.scriptsFound.length > 0) {
            console.log('\nScripts found by detector:');
            result.scriptsFound.forEach((script, i) => {
                console.log(`${i + 1}. ${script}`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testPompdelux();