const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read env variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
    }
  }
});

const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const sbKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = env.CLOUDINARY_API_KEY;
const apiSecret = env.CLOUDINARY_API_SECRET;

if (!sbUrl || !sbKey) {
  console.error('Supabase URL or Key missing in .env.local');
  process.exit(1);
}

const sb = createClient(sbUrl, sbKey);

function extractCloudinaryPublicId(url) {
  if (!url) return null;
  const cleanUrl = url.split('?')[0];
  const uploadIndex = cleanUrl.indexOf('/upload/');
  if (uploadIndex === -1) return null;
  const afterUpload = cleanUrl.substring(uploadIndex + 8);
  const segments = afterUpload.split('/');
  let startIndex = 0;
  for (let i = 0; i < segments.length; i++) {
    if (/^v\d+$/.test(segments[i])) {
      startIndex = i + 1;
      break;
    }
  }
  if (
    startIndex === 0 &&
    segments.length > 1 &&
    (segments[0].includes(',') || segments[0].includes('_'))
  ) {
    startIndex = 1;
  }
  const relevantSegments = segments.slice(startIndex);
  const joined = decodeURIComponent(relevantSegments.join('/'));
  const lastDotIndex = joined.lastIndexOf('.');
  return lastDotIndex !== -1 ? joined.substring(0, lastDotIndex) : joined;
}

function getJpegSize(buf) {
  let i = 0;
  if (buf[i] !== 0xff || buf[i + 1] !== 0xd8) return null;
  i += 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      const height = (buf[i + 5] << 8) + buf[i + 6];
      const width = (buf[i + 7] << 8) + buf[i + 8];
      return { width, height };
    }
    const len = (buf[i + 2] << 8) + buf[i + 3];
    i += 2 + len;
  }
  return null;
}

async function migrate() {
  console.log('--- STARTING RATIO MIGRATION ---');

  // 1. Fetch all items from Supabase contents
  const { data: items, error: fetchErr } = await sb
    .from('contents')
    .select('id, type, image_url, video_url, ratio');

  if (fetchErr) {
    console.error('Error fetching contents:', fetchErr);
    process.exit(1);
  }

  console.log(`Found ${items.length} items in contents table.`);

  // 2. Fetch all Cloudinary resources
  console.log('Fetching Cloudinary resources list...');
  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  let allResources = [];
  let nextCursor = null;
  do {
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=500${
      nextCursor ? `&next_cursor=${nextCursor}` : ''
    }`;
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    const data = await res.json();
    allResources = allResources.concat(data.resources || []);
    nextCursor = data.next_cursor;
  } while (nextCursor);

  console.log(`Loaded ${allResources.length} resources from Cloudinary.`);
  const cldMap = new Map();
  allResources.forEach((r) => {
    cldMap.set(r.public_id, (r.width / r.height).toFixed(4));
  });

  // 3. Process each item and compute its ratio
  let updatedCount = 0;
  let alreadySetCount = 0;
  let failedCount = 0;

  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    let calculatedRatio = null;

    if (it.image_url && it.image_url.includes('res.cloudinary.com')) {
      // Cloudinary image
      const pid = extractCloudinaryPublicId(it.image_url);
      if (pid && cldMap.has(pid)) {
        calculatedRatio = cldMap.get(pid);
      } else {
        // Fallback: try individual Cloudinary resource lookup
        try {
          const singleUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${encodeURIComponent(
            pid
          )}`;
          const singleRes = await fetch(singleUrl, {
            headers: { Authorization: `Basic ${auth}` },
          });
          if (singleRes.ok) {
            const singleData = await singleRes.json();
            calculatedRatio = (singleData.width / singleData.height).toFixed(4);
          }
        } catch {}
      }
    } else if (
      it.type === 'video' &&
      it.video_url &&
      (it.video_url.includes('youtu.be') || it.video_url.includes('youtube.com'))
    ) {
      // YouTube video
      if (it.video_url.includes('/shorts/')) {
        calculatedRatio = '0.8000'; // 4:5
      } else {
        calculatedRatio = '1.7778'; // 16:9
      }
    } else if (
      it.image_url &&
      (it.image_url.includes('cdn.justermp.my.id') || it.image_url.includes('r2'))
    ) {
      // R2 poster image
      try {
        const res = await fetch(it.image_url, { headers: { Range: 'bytes=0-65536' } });
        const buf = Buffer.from(await res.arrayBuffer());
        const size = getJpegSize(buf);
        if (size && size.height > 0) {
          calculatedRatio = (size.width / size.height).toFixed(4);
        }
      } catch (err) {
        console.warn(`Failed to read R2 image for item ${it.id}:`, err.message);
      }
    }

    // Default fallback if undetectable
    if (!calculatedRatio) {
      calculatedRatio = it.type === 'video' ? '1.7778' : '0.8000';
    }

    // Update in Supabase
    const { error: updateErr } = await sb
      .from('contents')
      .update({ ratio: calculatedRatio })
      .eq('id', it.id);

    if (updateErr) {
      console.error(`Failed to update item ${it.id}:`, updateErr.message);
      failedCount++;
    } else {
      updatedCount++;
    }

    if ((idx + 1) % 25 === 0 || idx === items.length - 1) {
      console.log(`Progress: ${idx + 1} / ${items.length} updated...`);
    }
  }

  console.log('\n--- MIGRATION COMPLETE ---');
  console.log(`Total items processed : ${items.length}`);
  console.log(`Successfully updated  : ${updatedCount}`);
  console.log(`Failed                : ${failedCount}`);

  // Final verification
  const { data: verifyData } = await sb.from('contents').select('id, ratio');
  const remainingNull = verifyData.filter((i) => !i.ratio).length;
  console.log(`Remaining null ratio  : ${remainingNull}`);
}

migrate();
