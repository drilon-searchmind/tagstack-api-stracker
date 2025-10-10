const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { ServerSideGTMDetector } = require('../utils/serverSideGTMDetector');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

const gtmDetector = new ServerSideGTMDetector();

app.post('/api/scan', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'missing url' });

    try {
        const result = await gtmDetector.detectGTMContainers(url);
        
        const transformedResult = {
            success: !result.error,
            scannedUrl: url,
            result: {
                isGTMPresent: result.isGTMPresent,
                containerIDs: result.containerIDs,
                detectionMethods: result.detectionMethods,
                dataLayerEvents: result.dataLayerEvents,
                scriptsFound: result.scriptsFound,
                networkRequests: result.networkRequests,
                extra: {
                    scripts: result.scriptsFound,
                    hasGTMObject: result.isGTMPresent,
                    gtmKeys: result.containerIDs,
                    dataLayerSnapshot: result.dataLayerEvents
                }
            }
        };

        if (result.error) {
            transformedResult.result.error = result.error;
        }

        return res.json(transformedResult);
    } catch (err) {
        return res.status(500).json({ error: String(err) });
    }
});

const port = process.env.PORT || 4000;
if (require.main === module) {
    app.listen(port, () => console.log(`Scan server running on ${port}`));
}

module.exports = app;