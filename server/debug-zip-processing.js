import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import { isZipFile, getMimeTypeFromExtension } from './utils/zipUtils.js';

/**
 * Debug script to analyze ZIP file processing and identify missing files
 */
async function debugZipProcessing(zipFilePath) {
  try {
    console.log(`🔍 Debugging ZIP file: ${zipFilePath}`);
    
    if (!await fs.pathExists(zipFilePath)) {
      console.error(`❌ ZIP file not found: ${zipFilePath}`);
      return;
    }

    // Read ZIP file
    const zip = new AdmZip(zipFilePath);
    const zipEntries = zip.getEntries();
    
    console.log(`📦 ZIP contains ${zipEntries.length} total entries`);
    
    const analysis = {
      totalEntries: zipEntries.length,
      directories: [],
      files: [],
      skippedFiles: [],
      processedFiles: [],
      errors: []
    };

    // Analyze each entry
    for (const entry of zipEntries) {
      const entryInfo = {
        name: entry.entryName,
        isDirectory: entry.isDirectory,
        size: entry.header.size,
        compressedSize: entry.header.compressedSize,
        extension: path.extname(entry.entryName).toLowerCase()
      };

      if (entry.isDirectory) {
        analysis.directories.push(entryInfo);
        continue;
      }

      analysis.files.push(entryInfo);

      // Check if file would be skipped
      const skipReasons = [];
      
      // Check for skipped directories
      const skipDirs = ['node_modules', '.git', '__MACOSX', '.DS_Store', 'dist', 'build', 'coverage', '.nyc_output', 'logs', 'tmp', 'temp'];
      if (skipDirs.some(dir => entry.entryName.includes(dir))) {
        skipReasons.push(`Directory in skip list: ${skipDirs.find(dir => entry.entryName.includes(dir))}`);
      }

      // Check file size (50MB limit)
      if (entry.header.size > 50 * 1024 * 1024) {
        skipReasons.push(`File too large: ${Math.round(entry.header.size / 1024 / 1024)}MB`);
      }

      // Check file extension
      const allowedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.xml', '.txt', '.md', '.sql', '.yaml', '.yml', '.py', '.java', '.c', '.cpp', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.clj', '.hs', '.ml', '.fs', '.dart', '.lua', '.pl', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd'];
      if (allowedExtensions.length > 0 && !allowedExtensions.includes(entryInfo.extension)) {
        skipReasons.push(`Unsupported extension: ${entryInfo.extension}`);
      }

      if (skipReasons.length > 0) {
        analysis.skippedFiles.push({
          ...entryInfo,
          skipReasons
        });
      } else {
        analysis.processedFiles.push(entryInfo);
      }
    }

    // Display results
    console.log('\n📊 ANALYSIS RESULTS:');
    console.log(`📁 Total entries: ${analysis.totalEntries}`);
    console.log(`📂 Directories: ${analysis.directories.length}`);
    console.log(`📄 Files: ${analysis.files.length}`);
    console.log(`✅ Files that would be processed: ${analysis.processedFiles.length}`);
    console.log(`❌ Files that would be skipped: ${analysis.skippedFiles.length}`);

    if (analysis.skippedFiles.length > 0) {
      console.log('\n❌ SKIPPED FILES:');
      analysis.skippedFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`);
        console.log(`   Size: ${Math.round(file.size / 1024)}KB`);
        console.log(`   Extension: ${file.extension}`);
        console.log(`   Reasons: ${file.skipReasons.join(', ')}`);
        console.log('');
      });
    }

    if (analysis.processedFiles.length > 0) {
      console.log('\n✅ PROCESSED FILES:');
      analysis.processedFiles.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name} (${Math.round(file.size / 1024)}KB, ${file.extension})`);
      });
    }

    // Check if the count matches your expectation
    const expectedFiles = 17;
    const actualProcessedFiles = analysis.processedFiles.length;
    
    console.log(`\n🎯 EXPECTED vs ACTUAL:`);
    console.log(`Expected files: ${expectedFiles}`);
    console.log(`Files that would be processed: ${actualProcessedFiles}`);
    
    if (actualProcessedFiles < expectedFiles) {
      console.log(`❌ MISSING: ${expectedFiles - actualProcessedFiles} files`);
      console.log('Check the skipped files list above to see which files are being filtered out.');
    } else if (actualProcessedFiles > expectedFiles) {
      console.log(`✅ MORE than expected: ${actualProcessedFiles - expectedFiles} additional files`);
    } else {
      console.log(`✅ PERFECT MATCH!`);
    }

    return analysis;

  } catch (error) {
    console.error('❌ Debug error:', error);
    return null;
  }
}

// Run the debug if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const zipFilePath = process.argv[2];
  if (!zipFilePath) {
    console.log('Usage: node debug-zip-processing.js <path-to-zip-file>');
    console.log('Example: node debug-zip-processing.js ./uploads/temp/your-zip-file.zip');
    process.exit(1);
  }
  
  debugZipProcessing(zipFilePath);
}

export { debugZipProcessing };
