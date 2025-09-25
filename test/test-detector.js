const { ServerSideGTMDetector } = require('../utils/serverSideGTMDetector');

/**
 * Test script to validate the server-side GTM detector
 */
async function testDetector() {
    console.log('🧪 Testing Server-Side GTM Detector...\n');
    
    const detector = new ServerSideGTMDetector();
    
    // Test websites (feel free to change these)
    const testUrls = [
        'https://marketingplatform.google.com/about/',  // Likely has real GTM
        'https://example.com'          // Simple test site
    ];
    
    for (const url of testUrls) {
        console.log(`🔍 Scanning: ${url}`);
        console.log('─'.repeat(50));
        
        try {
            const result = await detector.detectGTMContainers(url);
            
            console.log(`✅ GTM Present: ${result.isGTMPresent}`);
            console.log(`📋 Container IDs: ${result.containerIDs.length > 0 ? result.containerIDs.join(', ') : 'None found'}`);
            console.log(`🕵️ Detection Methods: ${result.detectionMethods.length}`);
            
            if (result.detectionMethods.length > 0) {
                result.detectionMethods.forEach((method, i) => {
                    console.log(`   ${i + 1}. ${method}`);
                });
            }
            
            if (result.scriptsFound.length > 0) {
                console.log(`📜 GTM Scripts Found: ${result.scriptsFound.length}`);
                result.scriptsFound.forEach((script, i) => {
                    console.log(`   ${i + 1}. ${script.substring(0, 80)}...`);
                });
            }
            
            if (result.error) {
                console.log(`❌ Error: ${result.error}`);
            }
            
        } catch (error) {
            console.log(`💥 Failed: ${error.message}`);
        }
        
        console.log('\n');
    }
    
    console.log('✨ Testing complete!');
}

// Run the test if called directly
if (require.main === module) {
    testDetector().catch(console.error);
}

module.exports = { testDetector };