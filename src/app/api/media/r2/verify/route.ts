import { NextResponse } from 'next/server';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

function cleanKey(raw: string): string {
  let cleaned = raw.split('?')[0].trim();
  const cdnMatch = cleaned.match(/https?:\/\/[^/]+\/(.+)$/);
  if (cdnMatch) {
    cleaned = decodeURIComponent(cdnMatch[1]);
  }
  return cleaned.replace(/^\//, '');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawKeys: string[] = [];

    if (body.key && typeof body.key === 'string') {
      rawKeys.push(body.key);
    }
    if (body.url && typeof body.url === 'string') {
      rawKeys.push(body.url);
    }
    if (Array.isArray(body.keys)) {
      body.keys.forEach((k: unknown) => {
        if (typeof k === 'string' && k.trim()) rawKeys.push(k.trim());
      });
    }

    if (rawKeys.length === 0) {
      return NextResponse.json(
        { exists: false, error: 'At least one key or url is required to verify' },
        { status: 400 }
      );
    }

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME || 'justerstore';

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      // If R2 credentials are not configured, treat as unverified/bypass
      return NextResponse.json({
        exists: true,
        notice: 'Cloudflare R2 credentials not fully configured; skipped verification.',
      });
    }

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const allowedFolder = (process.env.R2_FOLDER || 'louiportfolio').replace(/\/$/, '');
    const results: { key: string; exists: boolean; size?: number }[] = [];

    for (const raw of rawKeys) {
      const key = cleanKey(raw);
      if (!key.startsWith(`${allowedFolder}/`)) {
        results.push({ key, exists: false });
        continue;
      }

      try {
        const head = await s3.send(
          new HeadObjectCommand({
            Bucket: bucketName,
            Key: key,
          })
        );
        results.push({ key, exists: true, size: head.ContentLength });
      } catch (err: unknown) {
        results.push({ key, exists: false });
      }
    }

    const allExist = results.length > 0 && results.every((r) => r.exists);
    const missingKeys = results.filter((r) => !r.exists).map((r) => r.key);

    return NextResponse.json({
      exists: allExist,
      allExist,
      results,
      missingKeys,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { exists: false, error: error.message || 'Failed to verify object in Cloudflare R2' },
      { status: 500 }
    );
  }
}
