import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create necessary directories
const createDirectories = async () => {
  const directories = [
    './uploads',
    './uploads/sessions',
    './uploads/archives',
    './uploads/temp',
    './logs'
  ];

  for (const dir of directories) {
    const fullPath = path.join(__dirname, dir);
    await fs.ensureDir(fullPath);
    console.log(`✅ Created directory: ${dir}`);
  }
};

// Create .env file if it doesn't exist
const createEnvFile = async () => {
  const envPath = path.join(__dirname, '.env');
  const envExamplePath = path.join(__dirname, 'env.example');

  if (!await fs.pathExists(envPath)) {
    if (await fs.pathExists(envExamplePath)) {
      await fs.copy(envExamplePath, envPath);
      console.log('✅ Created .env file from env.example');
      console.log('⚠️  Please update .env file with your configuration');
    } else {
      // Create basic .env file
      const envContent = `# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/migration-service

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRE=7d

# File Storage Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=104857600
MAX_FILES_PER_SESSION=100

# Storage Provider (local, s3, gcs)
STORAGE_PROVIDER=local

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-change-this-in-production
`;

      await fs.writeFile(envPath, envContent);
      console.log('✅ Created basic .env file');
      console.log('⚠️  Please update .env file with your configuration');
    }
  } else {
    console.log('✅ .env file already exists');
  }
};

// Main setup function
const setup = async () => {
  console.log('🚀 Setting up Migration Service Backend...\n');

  try {
    await createDirectories();
    await createEnvFile();

    console.log('\n✅ Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update .env file with your configuration');
    console.log('2. Start MongoDB (docker run -d -p 27017:27017 --name mongodb mongo:latest)');
    console.log('3. Run: npm run dev');
    console.log('\n🌐 API will be available at: http://localhost:5000');
    console.log('📊 Health check: http://localhost:5000/health');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

// Run setup
setup();
