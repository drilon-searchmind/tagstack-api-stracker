const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

// point to the tracer you already have
const tracerPath = path.join(__dirname, '..', '..', 'temp-folder', 'temp.js');
const tracerCode = fs.readFileSync(tracerPath, 'utf8');

app.post('/api/scan', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'missing url' });

    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (compatible; GTM-Scanner/1.0)');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        // inject your tracer and run it in page context
        const rawResult = await page.evaluate(async (code) => {
            // evaluate tracer script
            try {
                /* eslint-disable no-eval */
                eval(code);
                // if your tracer registers traceGTMContainers globally, call it
                if (typeof traceGTMContainers === 'function') {
                    const r = await traceGTMContainers();
                    // ensure Sets -> arrays
                    if (r && r.containerIDs && typeof r.containerIDs.forEach === 'function') {
                        r.containerIDs = Array.from(r.containerIDs);
                    }
                    return r;
                }
                return { error: 'traceGTMContainers not found' };
            } catch (e) {
                return { error: 'tracer_eval_error', message: String(e) };
            }
        }, tracerCode);

        // gather additional info: script srcs and any google_tag_manager object
        const extra = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
            const gtm = window.google_tag_manager || null;
            const dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer.slice(-50) : null;
            return { scripts, hasGTMObject: !!gtm, gtmKeys: gtm ? Object.keys(gtm) : [], dataLayerSnapshot: dataLayer };
        });

        const result = Object.assign({}, rawResult || {}, { extra });
        await browser.close();
        return res.json({ success: true, scannedUrl: url, result });
    } catch (err) {
        await browser.close();
        return res.status(500).json({ error: String(err) });
    }
});

const port = process.env.PORT || 4000;
if (require.main === module) {
    app.listen(port, () => console.log(`Scan server running on ${port}`));
}

module.exports = app;