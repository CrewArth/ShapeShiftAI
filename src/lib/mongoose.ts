import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

const options: mongoose.ConnectOptions = {
  bufferCommands: true,
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
  heartbeatFrequencyMS: 1000,
  retryWrites: true,
  retryReads: true,
  maxIdleTimeMS: 30000,
};

mongoose.set('strictQuery', true);

let isConnected = false;

export async function connectToDatabase() {
  if (isConnected) {
    console.log('[MongoDB] Using existing connection');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI!, options);
    isConnected = true;
    console.log('[MongoDB] Connected successfully');

    // Add connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[MongoDB] Connection disconnected');
      isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('[MongoDB] Connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('[MongoDB] Error during connection closure:', err);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    isConnected = false;
    throw error;
  }
} 