import { supabase } from './server/supabase';

async function testUpload() {
  console.log('Testing Supabase Storage upload...');
  
  // Create a simple test image (1x1 red pixel PNG)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
  const imageBuffer = Buffer.from(testImageBase64, 'base64');
  
  const fileName = `test-upload-${Date.now()}.png`;
  const filePath = `generated-images/${fileName}`;
  
  console.log('Uploading to bucket: generated-images');
  console.log('File path:', filePath);
  
  const { data, error } = await supabase.storage
    .from('generated-images')
    .upload(filePath, imageBuffer, {
      contentType: 'image/png',
      upsert: false
    });
  
  if (error) {
    console.error('Upload FAILED:', error.message);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return;
  }
  
  console.log('Upload SUCCESS:', data);
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('generated-images')
    .getPublicUrl(filePath);
  
  console.log('Public URL:', publicUrl);
}

testUpload().catch(console.error);
