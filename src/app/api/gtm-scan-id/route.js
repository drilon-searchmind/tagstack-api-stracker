export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { ServerSideGTMDetector } from "../../../../utils/serverSideGTMDetector.js";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    if (!url) return NextResponse.json({ message: "URL parameter is required" }, { status: 400 });

    // Initialize server-side GTM detector (no browser required!)
    const gtmDetector = new ServerSideGTMDetector();
    
    // Perform server-side GTM detection
    const scanResult = await gtmDetector.detectGTMContainers(url);
    
    // Transform to match expected API format
    const containers = scanResult.containerIDs.map(id => ({ id }));
    
    const result = {
      success: !scanResult.error,
      url,
      scanTimestamp: new Date().toISOString(),
      containers,
      detectionMethods: scanResult.detectionMethods,
      dataLayerEvents: scanResult.dataLayerEvents,
      scripts: scanResult.scriptsFound,
      rawTracer: {
        isGTMPresent: scanResult.isGTMPresent,
        containerIDs: scanResult.containerIDs,
        detectionMethods: scanResult.detectionMethods,
        dataLayerEvents: scanResult.dataLayerEvents,
        scriptsFound: scanResult.scriptsFound,
        networkRequests: scanResult.networkRequests
      }
    };

    if (scanResult.error) {
      result.error = scanResult.error;
      result.success = false;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}