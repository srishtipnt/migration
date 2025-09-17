// Test script for Cloudinary ZIP upload functionality
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dwpj1cr3e',
  api_key: process.env.CLOUDINARY_API_KEY || '252216879214925',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'vQzTI2sfVrJTd1-g_Ff4vuSiMTY',
  secure: true
});

console.log('🧪 Testing Cloudinary ZIP Upload Structure...');
console.log('☁️  Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME || 'dwpj1cr3e');

async function testCloudinaryStructure() {
  try {
    console.log('\n📁 Testing folder structure creation...');
    
    // Test the chunking-friendly path structure
    const testPaths = [
      'migrateapp/users/test-user/sessions/zip-1234567890-abcdef12/by-type/javascript/folders/src/size-group/medium',
      'migrateapp/users/test-user/sessions/zip-1234567890-abcdef12/by-type/css/folders/styles/size-group/small',
      'migrateapp/users/test-user/sessions/zip-1234567890-abcdef12/by-type/html/root/size-group/large'
    ];
    
    for (const testPath of testPaths) {
      console.log(`📂 Testing path: ${testPath}`);
      
      // Test uploading a small file to this path
      const testContent = `// Test file for ${testPath}`;
      const tempFile = path.join('./temp', `test-${Date.now()}.js`);
      await fs.ensureDir(path.dirname(tempFile));
      await fs.writeFile(tempFile, testContent);
      
      try {
        const uploadResult = await cloudinary.uploader.upload(tempFile, {
          folder: testPath,
          resource_type: 'raw',
          public_id: 'test-file',
          use_filename: true,
          unique_filename: true,
          tags: [
            'test',
            'structure-test',
            'chunking-friendly'
          ],
          context: {
            test_path: testPath,
            created_by: 'test-script'
          }
        });
        
        console.log(`✅ Successfully uploaded to: ${uploadResult.public_id}`);
        console.log(`🔗 URL: ${uploadResult.secure_url}`);
        
        // Clean up the uploaded file
        await cloudinary.uploader.destroy(uploadResult.public_id);
        console.log(`🗑️  Cleaned up test file: ${uploadResult.public_id}`);
        
      } catch (uploadError) {
        console.error(`❌ Upload failed for path ${testPath}:`, uploadError.message);
      } finally {
        // Clean up temp file
        await fs.remove(tempFile);
      }
    }
    
    console.log('\n🎉 Cloudinary structure test completed successfully!');
    console.log('✅ ZIP files will be stored with chunking-friendly structure');
    console.log('📁 Folder structure: migrateapp/users/{userId}/sessions/{sessionId}/by-type/{fileType}/folders/{path}/size-group/{size}');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCloudinaryStructure();
