import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const url = searchParams.get('url');

        if (!url) {
            return NextResponse.json(
                { message: "URL parameter is required" },
                { status: 400 }
            );
        }

        const apiKey = process.env.TAGSTACK_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { message: "TagStack API key not configured" },
                { status: 500 }
            );
        }

        const response = await fetch(`https://service.tagstack.io/api/scan?url=${encodeURIComponent(url)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(
                { message: data.message || "Error from TagStack API" },
                { status: response.status }
            );
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error("Error scanning URL:", error);
        return NextResponse.json(
            { message: "Failed to scan URL" },
            { status: 500 }
        );
    }
}