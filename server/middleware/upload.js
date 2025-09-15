import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Ensure upload directory exists
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Generate unique filename
export const generateFileName = (originalName) => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(16).toString('hex');
  const extension = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, extension);
  
  return `${timestamp}_${randomString}_${nameWithoutExt}${extension}`;
};

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = [
    // JavaScript/TypeScript
    'application/javascript',
    'text/javascript',
    'application/typescript',
    'text/typescript',
    'text/jsx',
    'text/tsx',
    
    // JSON
    'application/json',
    'text/json',
    
    // SQL
    'application/sql',
    'text/sql',
    
    // Text files
    'text/plain',
    'text/html',
    'text/css',
    'text/xml',
    'text/x-python',
    'text/x-java-source',
    'text/x-c',
    'text/x-c++',
    'text/x-csharp',
    'text/x-php',
    'text/x-ruby',
    'text/x-go',
    'text/x-rust',
    'text/x-swift',
    'text/x-kotlin',
    'text/x-scala',
    'text/x-clojure',
    'text/x-haskell',
    'text/x-ocaml',
    'text/x-fsharp',
    'text/x-dart',
    'text/x-lua',
    'text/x-perl',
    'text/x-shellscript',
    'text/x-yaml',
    'text/x-toml',
    'text/x-ini',
    'text/x-properties',
    'text/x-markdown',
    
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'image/bmp',
    'image/tiff',
    
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-tar',
    'application/gzip',
    'application/x-7z-compressed',
    
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    
    // Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    
    // Presentations
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Other programming files
    'application/octet-stream' // For files that don't have specific MIME types
  ];

  // Check file type
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Check file extension as fallback
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [
      // Web technologies
      '.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.htm', '.css', '.scss', '.sass', '.less',
      '.xml', '.svg', '.vue', '.svelte', '.astro',
      
      // Programming languages
      '.py', '.java', '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.cs', '.php', '.rb', '.go',
      '.rs', '.swift', '.kt', '.scala', '.clj', '.hs', '.ml', '.fs', '.dart', '.lua', '.pl',
      '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
      
      // Data formats
      '.sql', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.properties', '.env',
      '.csv', '.tsv', '.xml', '.json', '.json5', '.jsonc',
      
      // Documentation
      '.md', '.txt', '.rst', '.tex', '.rtf',
      
      // Images
      '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff', '.ico',
      
      // Archives
      '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
      
      // Documents
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      
      // Other
      '.log', '.lock', '.lockb', '.pid', '.tmp', '.temp'
    ];
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} with extension ${ext} is not allowed`), false);
    }
  }
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id || 'anonymous';
    const uploadPath = path.join(process.env.UPLOAD_PATH || './uploads', userId);
    ensureUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const fileName = generateFileName(file.originalname);
    cb(null, fileName);
  }
});

// Create multer upload instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 100 // Max 100 files per request
  }
});

// Error handling middleware for multer
export const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'File size exceeds the maximum limit of 50MB'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files',
        message: 'Maximum 100 files allowed per upload'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field',
        message: 'Unexpected file field name'
      });
    }
    
    return res.status(400).json({
      success: false,
      error: 'Upload error',
      message: error.message
    });
  }
  
  if (error.message.includes('File type')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: error.message
    });
  }
  
  next(error);
};