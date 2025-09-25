const { ServerSideGTMDetector } = require('../utils/serverSideGTMDetector');

async function testBothSites() {
    const detector = new ServerSideGTMDetector();
    
    const sites = [
        { name: 'lasselarsenhuse.dk (should work)', url: 'https://lasselarsenhuse.dk/' },
        { name: 'pompdelux.dk (stape)', url: 'https://pompdelux.dk/' }
    ];
    
    for (const site of sites) {
        console.log(`\n🔍 Testing ${site.name}`);
        console.log('='.repeat(60));
        
        try {
            const result = await detector.detectGTMContainers(site.url);
            
            console.log('✅ GTM Present:', result.isGTMPresent);
            console.log('📋 Container IDs:', result.containerIDs.length > 0 ? result.containerIDs : 'None found');
            console.log('🕵️ Detection Methods:', result.detectionMethods.length);
            
            result.detectionMethods.forEach((method, i) => {
                console.log(`   ${i + 1}. ${method}`);
            });
            
            if (result.scriptsFound.length > 0) {
                console.log('📜 Scripts Found:');
                result.scriptsFound.forEach((script, i) => {
                    console.log(`   ${i + 1}. ${script.substring(0, 100)}...`);
                });
            }
            
        } catch (error) {
            console.log('❌ Error:', error.message);
        }
    }
}

testBothSites();