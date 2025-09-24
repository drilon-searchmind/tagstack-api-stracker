"use client"

import React, { useState } from 'react';

export default function CustomScanGTM() {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [gtmContainers, setGtmContainers] = useState([]);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const resp = await fetch(`/api/gtm-scan-id?url=${encodeURIComponent(url)}`, { method: 'GET' });
            const json = await resp.json();

            console.log({json})
            if (!resp.ok) throw new Error(json.error || JSON.stringify(json));
            
            setResult(json);
            const containers = Array.isArray(json.containers)
                ? json.containers.filter(c => c && typeof c.id === 'string' && /^GTM-[A-Z0-9]+$/.test(c.id))
                : [];
            setGtmContainers(containers);
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <h3>Custom GTM Scanner</h3>
            <form onSubmit={handleSubmit}>
                <input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    required
                    style={{ width: '60%' }}
                />
                <button type="submit" disabled={loading}>Scan</button>
            </form>

            {loading && <p>Scanning… (this may take a few seconds)</p>}
            {error && <pre style={{ color: 'red' }}>{error}</pre>}

            {result && (
                <div>
                    <h4>Scan result</h4>
                    <pre style={{ maxHeight: '60vh', overflow: 'auto', background: '#f7f7f7', padding: 10 }}>
                        {JSON.stringify(gtmContainers, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}