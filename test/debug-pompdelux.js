const { ServerSideGTMDetector } = require('../utils/serverSideGTMDetector');

async function debugPompdelux() {
    console.log('🔧 Debug pompdelux GTM detection...');
    
    const detector = new ServerSideGTMDetector();
    
    try {
        const result = await detector.detectGTMContainers('https://pompdelux.dk/');
        
        console.log('\n=== RESULTS ===');
        console.log('GTM Present:', result.isGTMPresent);
        console.log('Container IDs BEFORE filtering:', Array.from(result.containerIDs || []));
        
        const properGTMIds = Array.from(result.containerIDs || []).filter(id => /^GTM-[A-Z0-9]+$/.test(id));
        console.log('Proper GTM IDs found:', properGTMIds);
        console.log('Should trigger alternative detection:', result.isGTMPresent && properGTMIds.length === 0);
        
        console.log('\nDetection Methods:');
        result.detectionMethods.forEach((method, i) => {
            console.log(`${i + 1}. ${method}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

debugPompdelux();