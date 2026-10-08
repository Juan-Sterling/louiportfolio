import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || 'justerstore';
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;

  const missingKeys: string[] = [];
  if (!accountId) missingKeys.push('R2_ACCOUNT_ID');
  if (!accessKeyId) missingKeys.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missingKeys.push('R2_SECRET_ACCESS_KEY');
  if (!bucketName) missingKeys.push('R2_BUCKET_NAME');
  if (!publicUrl) missingKeys.push('NEXT_PUBLIC_R2_PUBLIC_URL');

  return {
    isConfigured: missingKeys.length === 0,
    missingKeys,
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  };
}

export async function GET() {
  const config = getR2Config();
  return NextResponse.json({
    isConfigured: config.isConfigured,
    missingKeys: config.missingKeys,
    message: config.isConfigured
      ? 'Cloudflare R2 is configured and ready.'
      : `Missing Cloudflare R2 environment variables: ${config.missingKeys.join(', ')}`,
  });
}

export async function POST(request: Request) {
  try {
    const config = getR2Config();
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          error: `Cloudflare R2 is not configured in .env.local. Missing: ${config.missingKeys.join(
            ', '
          )}`,
        },
        { status: 400 }
      );
    }

    const { filename, contentType, size } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // Maximum 100MB
    const MAX_BYTES = 100 * 1024 * 1024;
    if (size && size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit for video upload' },
        { status: 400 }
      );
    }

    // Clean and sanitize filename
    const cleanFilename = filename
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_');

    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const folder = (process.env.R2_FOLDER || 'louiportfolio').replace(/\/$/, '');
    const key = `${folder}/${Date.now()}-${randomSuffix}-${cleanFilename}`;

    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretAccessKey!,
      },
    });

    const command = new PutObjectCommand({
      Bucket: config.bucketName!,
      Key: key,
      ContentType: contentType || 'video/mp4',
    });

    // 1-hour presigned PUT URL
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    const publicUrl = `${config.publicUrl!.replace(/\/$/, '')}/${key}`;

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || 'Failed to generate Cloudflare R2 presigned upload URL' },
      { status: 500 }
    );
  }
}
