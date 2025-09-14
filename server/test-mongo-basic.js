import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function testMongoDB() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/migration-service');
    console.log('✅ Connected to MongoDB');

    // Create a simple schema
    const TestSchema = new mongoose.Schema({
      name: String,
      data: String,
      createdAt: { type: Date, default: Date.now }
    });

    const TestModel = mongoose.model('Test', TestSchema);

    // Save a test document
    console.log('📝 Saving test document...');
    const testDoc = new TestModel({
      name: 'test-document',
      data: 'This is a test document to verify MongoDB storage'
    });

    const saved = await testDoc.save();
    console.log('✅ Document saved successfully!');
    console.log('📊 Document ID:', saved._id);
    console.log('📊 Document name:', saved.name);

    // Retrieve the document
    console.log('📥 Retrieving document...');
    const retrieved = await TestModel.findById(saved._id);
    if (retrieved) {
      console.log('✅ Document retrieved successfully!');
      console.log('📊 Retrieved data:', retrieved.data);
    }

    // Count documents
    const count = await TestModel.countDocuments();
    console.log('📊 Total documents in collection:', count);

    // Clean up
    await TestModel.deleteOne({ _id: saved._id });
    console.log('🧹 Test document cleaned up');

    console.log('\\n🎉 MongoDB storage test PASSED!');
    console.log('✅ MongoDB is working and can store/retrieve data');

  } catch (error) {
    console.error('❌ MongoDB test FAILED:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testMongoDB();





