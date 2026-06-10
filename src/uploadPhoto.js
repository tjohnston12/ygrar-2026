// uploadPhoto.js  (client-side helper, runs in the racer's browser)
//
// Reads the photo's GPS EXIF BEFORE uploading (important — see note below),
// then uploads to Cloudinary and hands you back the hosted URL + coordinates
// so you can save them to Airtable.
//
// npm install exifr   (tiny library for reading EXIF/GPS from the file)

import exifr from 'exifr';

export async function uploadPhoto(file) {
  // 1. Read GPS out of the ORIGINAL file first.
  //    Cloudinary (and most transforms) strip EXIF, so grab coordinates here
  //    while you still have the untouched file — this is your CP verification data.
  const gps = await exifr.gps(file); // -> { latitude, longitude } or undefined
  if (!gps) {
    throw new Error('No GPS data found in this photo — can’t verify the CP.');
  }

  // 2. Ask your Vercel function for a one-time signature.
  const signRes = await fetch('/api/cloudinary-sign', { method: 'POST' });
  const { signature, timestamp, folder, apiKey, cloudName } = await signRes.json();

  // 3. Upload the file straight to Cloudinary using that signature.
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  form.append('folder', folder);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: form }
  );
  const data = await uploadRes.json();

  if (data.error) {
    throw new Error(`Cloudinary upload failed: ${data.error.message}`);
  }

  // 4. Save data.secure_url to Airtable — NOT the image bytes.
  //    Bundle the GPS so the CP can be verified against the target location.
  return {
    url: data.secure_url,        // hosted photo URL
    publicId: data.public_id,    // handy if you ever need to delete/replace it
    latitude: gps.latitude,
    longitude: gps.longitude,
  };
}

// Example usage when a racer submits CP proof:
//
//   const result = await uploadPhoto(fileInput.files[0]);
//   await fetch('/api/save-cp-photo', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(result),   // -> your Airtable write happens server-side
//   });
async function uploadFile(file){
  const signRes = await fetch('/api/cloudinary-sign',{method:'POST'});
  if(!signRes.ok){
    const t = await signRes.text().catch(()=> '');
    throw new Error('Photo signing failed ('+signRes.status+'). '+t.slice(0,120));
  }
  const sign = await signRes.json();
  if(!sign || !sign.cloudName || !sign.apiKey || !sign.signature){
    throw new Error('Photo upload not configured — check Cloudinary env vars on Vercel.');
  }
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.apiKey);
  form.append('timestamp', sign.timestamp);
  form.append('signature', sign.signature);
  form.append('folder', sign.folder);
  const res = await fetch('https://api.cloudinary.com/v1_1/'+sign.cloudName+'/image/upload',{method:'POST',body:form});
  const out = await res.json();
  if(out.error) throw new Error(out.error.message);
  if(!out.secure_url) throw new Error('Cloudinary returned no image URL.');
  return out.secure_url;
}
