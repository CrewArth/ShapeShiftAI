import { Schema, model, models } from 'mongoose';

const UserCreditsSchema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  credits: {
    type: Number,
    default: 25, // Default free credits for new users
  },
  subscription: {
    type: {
      type: String,
      enum: ['none', 'ninja', 'pro', 'promax'],
      default: 'none',
    },
    razorpaySubscriptionId: String,
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active',
    },
  },
  transactions: [{
    type: {
      type: String,
      enum: ['subscription', 'topup', 'usage'],
      required: true,
    },
    amount: Number,
    credits: Number,
    razorpayPaymentId: String,
    modelType: {
      type: String,
      enum: ['text-to-3d', 'image-to-3d'],
    },
    prompt: String,
    imageUrl: String,
    modelUrl: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'pending',
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Add index for faster queries
UserCreditsSchema.index({ userId: 1 });

// Update the updatedAt timestamp before saving
UserCreditsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default models.UserCredits || model('UserCredits', UserCreditsSchema); 