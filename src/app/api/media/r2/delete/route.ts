import { NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request: Request) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: 'R2 object key is required' }, { status: 400 });
    }

    if (key.includes('..') || key.includes('\\') || key.includes('//')) {
      return NextResponse.json({ error: 'Invalid key path' }, { status: 400 });
    }

    const allowedFolder = (process.env.R2_FOLDER || 'louiportfolio').replace(/\/$/, '');
    if (!key.startsWith(`${allowedFolder}/`)) {
      return NextResponse.json(
        { error: 'Access denied: cannot delete outside allowed folder' },
        { status: 403 }
      );
    }

    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucketName = process.env.R2_BUCKET_NAME || 'justerstore';

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      return NextResponse.json({
        success: true,
        notice: 'Cloudflare R2 credentials not fully configured; skipped storage object deletion.',
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

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3.send(command);

    return NextResponse.json({ success: true, key });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || 'Failed to delete object from Cloudflare R2' },
      { status: 500 }
    );
  }
}
