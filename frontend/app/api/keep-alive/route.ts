import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://gridalpha.onrender.com';

        // Ping the backend's root docs endpoint to wake it up
        const res = await fetch(`${backendUrl}/docs`, { cache: 'no-store' });

        if (res.ok) {
            return NextResponse.json({ status: 'ok', message: 'Backend pinged successfully and is awake.' });
        } else {
            return NextResponse.json({ status: 'warning', message: `Backend responded with ${res.status}` }, { status: 200 });
        }
    } catch (err) {
        console.error('Keep-alive ping failed:', err);
        return NextResponse.json({ status: 'error', message: 'Failed to reach backend' }, { status: 500 });
    }
}
