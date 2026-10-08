import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

function getS3Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return new NextResponse('Video key is required', { status: 400 });
    }

    // Security Safeguards: Prevent path traversal
    if (key.includes('..') || key.includes('\\') || key.includes('//')) {
      return new NextResponse('Invalid video key path', { status: 400 });
    }

    // Restrict strictly to allowed folder (louiportfolio)
    const allowedFolder = (process.env.R2_FOLDER || 'louiportfolio').replace(/\/$/, '');
    if (!key.startsWith(`${allowedFolder}/`)) {
      return new NextResponse('Access denied: key outside designated folder', { status: 403 });
    }

    // Restrict strictly to media formats (videos and thumbnail images)
    if (!key.match(/\.(mp4|webm|mov|m4v|mkv|jpg|jpeg|png|webp|avif|gif)$/i)) {
      return new NextResponse('Access denied: only media files can be streamed', { status: 400 });
    }

    const s3 = getS3Client();
    if (!s3) {
      return new NextResponse('Cloudflare R2 is not configured in .env.local', { status: 500 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || 'justerstore';
    const rangeHeader = request.headers.get('range');

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      Range: rangeHeader || undefined,
    });

    const res = await s3.send(command);

    if (!res.Body) {
      return new NextResponse('Media stream not found', { status: 404 });
    }

    const headers = new Headers();
    let detectedContentType = res.ContentType;
    if (!detectedContentType || detectedContentType === 'application/octet-stream') {
      if (key.match(/\.(jpg|jpeg)$/i)) detectedContentType = 'image/jpeg';
      else if (key.match(/\.png$/i)) detectedContentType = 'image/png';
      else if (key.match(/\.webp$/i)) detectedContentType = 'image/webp';
      else if (key.match(/\.avif$/i)) detectedContentType = 'image/avif';
      else if (key.match(/\.gif$/i)) detectedContentType = 'image/gif';
      else if (key.match(/\.mp4$/i)) detectedContentType = 'video/mp4';
      else if (key.match(/\.webm$/i)) detectedContentType = 'video/webm';
      else if (key.match(/\.mov$/i)) detectedContentType = 'video/quicktime';
      else detectedContentType = 'video/mp4';
    }
    headers.set('Content-Type', detectedContentType);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    if (res.ContentRange) {
      headers.set('Content-Range', res.ContentRange);
    }
    if (res.ContentLength !== undefined) {
      headers.set('Content-Length', res.ContentLength.toString());
    }

    const statusCode = res.ContentRange ? 206 : 200;

    // Stream directly via Web ReadableStream
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webStream = (res.Body as any).transformToWebStream();

    return new Response(webStream, {
      status: statusCode,
      headers,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return new NextResponse(error.message || 'Error streaming video from Cloudflare R2', {
      status: 500,
    });
  }
}
