#!/usr/bin/env node

/**
 * MongoDB Atlas Migration Script
 * 
 * This script helps migrate data from local MongoDB to MongoDB Atlas
 * and sets up Vector Search functionality
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';

// Load environment variables
dotenv.config();

// Import models
import CodeChunk from './src/models/CodeChunk.js';
import Embedding from './src/models/Embedding.js';
import EmbeddingAtlas from './src/models/EmbeddingAtlas.js';
import MigrationJob from './src/models/MigrationJob.js';
import FileStorage from './src/models/FileStorage.js';
import Session from './src/models/Session.js';
import User from './src/models/User.js';

class AtlasMigrationService {
  constructor() {
    this.localConnection = null;
    this.atlasConnection = null;
    this.migrationStats = {
      users: 0,
      sessions: 0,
      codeChunks: 0,
      embeddings: 0,
      migrationJobs: 0,
      fileStorage: 0,
      errors: []
    };
  }

  /**
   * Connect to both local and Atlas databases
   */
  async connectToDatabases() {
    try {
      console.log('🔗 Connecting to databases...');

      // Connect to local MongoDB
      const localUri = 'mongodb://localhost:27017/migration-service';
      this.localConnection = await mongoose.createConnection(localUri);
      console.log('✅ Connected to local MongoDB');

      // Connect to Atlas MongoDB
      const atlasUri = process.env.MONGODB_URI;
      if (!atlasUri || !atlasUri.includes('mongodb+srv://')) {
        throw new Error('MONGODB_URI environment variable not set or not an Atlas connection string');
      }

      this.atlasConnection = await mongoose.createConnection(atlasUri);
      console.log('✅ Connected to MongoDB Atlas');

    } catch (error) {
      console.error('❌ Database connection error:', error);
      throw error;
    }
  }

  /**
   * Migrate users
   */
  async migrateUsers() {
    try {
      console.log('👥 Migrating users...');
      
      const UserLocal = this.localConnection.model('User', User.schema);
      const UserAtlas = this.atlasConnection.model('User', User.schema);

      const users = await UserLocal.find({}).lean();
      if (users.length > 0) {
        await UserAtlas.insertMany(users, { ordered: false });
        this.migrationStats.users = users.length;
        console.log(`✅ Migrated ${users.length} users`);
      } else {
        console.log('ℹ️  No users to migrate');
      }
    } catch (error) {
      console.error('❌ Error migrating users:', error);
      this.migrationStats.errors.push(`Users: ${error.message}`);
    }
  }

  /**
   * Migrate sessions
   */
  async migrateSessions() {
    try {
      console.log('📁 Migrating sessions...');
      
      const SessionLocal = this.localConnection.model('Session', Session.schema);
      const SessionAtlas = this.atlasConnection.model('Session', Session.schema);

      const sessions = await SessionLocal.find({}).lean();
      if (sessions.length > 0) {
        await SessionAtlas.insertMany(sessions, { ordered: false });
        this.migrationStats.sessions = sessions.length;
        console.log(`✅ Migrated ${sessions.length} sessions`);
      } else {
        console.log('ℹ️  No sessions to migrate');
      }
    } catch (error) {
      console.error('❌ Error migrating sessions:', error);
      this.migrationStats.errors.push(`Sessions: ${error.message}`);
    }
  }

  /**
   * Migrate code chunks
   */
  async migrateCodeChunks() {
    try {
      console.log('🧩 Migrating code chunks...');
      
      const CodeChunkLocal = this.localConnection.model('CodeChunk', CodeChunk.schema);
      const CodeChunkAtlas = this.atlasConnection.model('CodeChunk', CodeChunk.schema);

      const codeChunks = await CodeChunkLocal.find({}).lean();
      if (codeChunks.length > 0) {
        // Process in batches to avoid memory issues
        const batchSize = 1000;
        for (let i = 0; i < codeChunks.length; i += batchSize) {
          const batch = codeChunks.slice(i, i + batchSize);
          await CodeChunkAtlas.insertMany(batch, { ordered: false });
          console.log(`📦 Migrated batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(codeChunks.length/batchSize)}`);
        }
        this.migrationStats.codeChunks = codeChunks.length;
        console.log(`✅ Migrated ${codeChunks.length} code chunks`);
      } else {
        console.log('ℹ️  No code chunks to migrate');
      }
    } catch (error) {
      console.error('❌ Error migrating code chunks:', error);
      this.migrationStats.errors.push(`CodeChunks: ${error.message}`);
    }
  }

  /**
   * Migrate embeddings and convert to Atlas format
   */
  async migrateEmbeddings() {
    try {
      console.log('🔍 Migrating embeddings...');
      
      const EmbeddingLocal = this.localConnection.model('Embedding', Embedding.schema);
      const EmbeddingAtlasModel = this.atlasConnection.model('EmbeddingAtlas', EmbeddingAtlas.schema);

      const embeddings = await EmbeddingLocal.find({}).lean();
      if (embeddings.length > 0) {
        // Convert embeddings to Atlas format
        const atlasEmbeddings = embeddings.map(embedding => ({
          sessionId: embedding.sessionId,
          chunkId: embedding.chunkId,
          chunkName: embedding.chunkName,
          code: embedding.code,
          filePath: embedding.filePath,
          chunkType: embedding.chunkType,
          language: embedding.language,
          complexity: embedding.complexity || 0,
          isAsync: embedding.isAsync || false,
          parameters: embedding.parameters || [],
          dependencies: embedding.dependencies || [],
          embedding: embedding.embedding,
          embeddingDimensions: embedding.embeddingDimensions || 768,
          embeddingModel: embedding.embeddingModel || 'text-embedding-004',
          metadata: embedding.metadata || {},
          createdAt: embedding.createdAt,
          updatedAt: embedding.updatedAt
        }));

        // Process in batches
        const batchSize = 500;
        for (let i = 0; i < atlasEmbeddings.length; i += batchSize) {
          const batch = atlasEmbeddings.slice(i, i + batchSize);
          await EmbeddingAtlasModel.insertMany(batch, { ordered: false });
          console.log(`📦 Migrated embedding batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(atlasEmbeddings.length/batchSize)}`);
        }
        this.migrationStats.embeddings = embeddings.length;
        console.log(`✅ Migrated ${embeddings.length} embeddings`);
      } else {
        console.log('ℹ️  No embeddings to migrate');
      }
    } catch (error) {
      console.error('❌ Error migrating embeddings:', error);
      this.migrationStats.errors.push(`Embeddings: ${error.message}`);
    }
  }

  /**
   * Migrate migration jobs
   */
  async migrateMigrationJobs() {
    try {
      console.log('⚙️ Migrating migration jobs...');
      
      const MigrationJobLocal = this.localConnection.model('MigrationJob', MigrationJob.schema);
      const MigrationJobAtlas = this.atlasConnection.model('MigrationJob', MigrationJob.schema);

      const migrationJobs = await MigrationJobLocal.find({}).lean();
      if (migrationJobs.length > 0) {
        await MigrationJobAtlas.insertMany(migrationJobs, { ordered: false });
        this.migrationStats.migrationJobs = migrationJobs.length;
        console.log(`✅ Migrated ${migrationJobs.length} migration jobs`);
      } else {
        console.log('ℹ️  No migration jobs to migrate');
      }
    } catch (error) {
      console.error('❌ Error migrating migration jobs:', error);
      this.migrationStats.errors.push(`MigrationJobs: ${error.message}`);
    }
  }

  /**
   * Migrate file storage
   */
  async migrateFileStorage() {
    try {
      console.log('📄 Migrating file storage...');
      
      const FileStorageLocal = this.localConnection.model('FileStorage', FileStorage.schema);
      const FileStorageAtlas = this.atlasConnection.model('FileStorage', FileStorage.schema);

      const fileStorage = await FileStorageLocal.find({}).lean();
      if (fileStorage.length > 0) {
        await FileStorageAtlas.insertMany(fileStorage, { ordered: false });
        this.migrationStats.fileStorage = fileStorage.length;
        console.log(`✅ Migrated ${fileStorage.length} file storage records`);
      } else {
        console.log('ℹ️  No file storage to migrate');
      }
    } catch (error) {
      console.error('❌ Error migrating file storage:', error);
      this.migrationStats.errors.push(`FileStorage: ${error.message}`);
    }
  }

  /**
   * Run complete migration
   */
  async runMigration() {
    try {
      console.log('🚀 Starting MongoDB Atlas migration...');
      console.log('=' .repeat(50));

      await this.connectToDatabases();
      
      await this.migrateUsers();
      await this.migrateSessions();
      await this.migrateCodeChunks();
      await this.migrateEmbeddings();
      await this.migrateMigrationJobs();
      await this.migrateFileStorage();

      console.log('=' .repeat(50));
      console.log('🎉 Migration completed!');
      this.printMigrationStats();

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.closeConnections();
    }
  }

  /**
   * Print migration statistics
   */
  printMigrationStats() {
    console.log('\n📊 Migration Statistics:');
    console.log(`👥 Users: ${this.migrationStats.users}`);
    console.log(`📁 Sessions: ${this.migrationStats.sessions}`);
    console.log(`🧩 Code Chunks: ${this.migrationStats.codeChunks}`);
    console.log(`🔍 Embeddings: ${this.migrationStats.embeddings}`);
    console.log(`⚙️ Migration Jobs: ${this.migrationStats.migrationJobs}`);
    console.log(`📄 File Storage: ${this.migrationStats.fileStorage}`);

    if (this.migrationStats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.migrationStats.errors.forEach(error => console.log(`  - ${error}`));
    }

    console.log('\n✅ Next steps:');
    console.log('1. Create Vector Search Index in Atlas UI');
    console.log('2. Update your application to use Atlas connection');
    console.log('3. Test vector search functionality');
  }

  /**
   * Close database connections
   */
  async closeConnections() {
    try {
      if (this.localConnection) {
        await this.localConnection.close();
        console.log('🔌 Closed local MongoDB connection');
      }
      if (this.atlasConnection) {
        await this.atlasConnection.close();
        console.log('🔌 Closed Atlas MongoDB connection');
      }
    } catch (error) {
      console.error('❌ Error closing connections:', error);
    }
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const migrationService = new AtlasMigrationService();
  
  migrationService.runMigration()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default AtlasMigrationService;
