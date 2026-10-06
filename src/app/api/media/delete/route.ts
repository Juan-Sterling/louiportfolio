import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { publicId, resourceType = 'image' } = await request.json();
    if (!publicId) {
      return NextResponse.json({ error: 'Public ID is required' }, { status: 400 });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      // If server keys aren't added yet, succeed gracefully so the UI is non-blocking
      return NextResponse.json({
        success: true,
        notice: 'Image removed from website. For full cloud storage deletion, set CLOUDINARY_API_KEY & CLOUDINARY_API_SECRET in .env.local',
      });
    }

    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    const params = new URLSearchParams();
    params.append('public_id', publicId);
    params.append('api_key', apiKey);
    params.append('timestamp', timestamp);
    params.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
      method: 'POST',
      body: params,
    });

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || 'Failed to delete from Cloudinary' },
      { status: 500 }
    );
  }
}
