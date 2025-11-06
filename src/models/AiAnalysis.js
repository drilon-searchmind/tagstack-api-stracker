import mongoose from 'mongoose';
import connectDB from '../lib/mongoose.js';

// Delete the existing model to avoid caching issues
if (mongoose.models.AiAnalysis) {
    delete mongoose.models.AiAnalysis;
}

const aiAnalysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Customer ID is required'],
        index: true
    },
    scannedUrlId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ScannedUrl',
        required: [true, 'Scanned URL ID is required'],
        unique: true // Remove index: true since we have unique: true
    },
    analysisData: {
        technicalSummary: {
            type: String,
            required: true
        },
        platformAnalysis: {
            type: String,
            default: ''
        },
        clientStrategySummary: {
            type: String,
            required: true
        },
        executiveSummary: {
            type: String,
            default: ''
        },
        keyFindings: [{
            type: String
        }],
        recommendations: [{
            type: String
        }],
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium'
        },
        complianceStatus: {
            type: String,
            enum: ['compliant', 'partial', 'non-compliant', 'unknown'],
            default: 'unknown'
        }
    },
    analysisStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    analysisDate: {
        type: Date,
        default: Date.now
    },
    aiModel: {
        type: String,
        default: 'gpt-4'
    },
    processingTime: {
        type: Number,
        default: 0
    },
    error: {
        type: String
    }
}, {
    timestamps: true
});

// Only keep the compound index, remove the duplicate scannedUrlId index
aiAnalysisSchema.index({ userId: 1, customerId: 1, scannedUrlId: 1 });

aiAnalysisSchema.statics.createAnalysis = async function (inputData) {
    await connectDB();
    
    const analysis = new this({
        userId: inputData.userId,
        customerId: inputData.customerId,
        scannedUrlId: inputData.scannedUrlId,
        analysisData: inputData.analysisData,
        analysisStatus: 'completed',
        aiModel: inputData.aiModel || 'gpt-4',
        processingTime: inputData.processingTime || 0
    });
    
    return await analysis.save();
};

aiAnalysisSchema.statics.findByScannedUrlId = async function (scannedUrlId, userId) {
    await connectDB();
    return await this.findOne({ 
        scannedUrlId, 
        userId 
    })
    .populate('scannedUrlId')
    .populate('customerId', 'name url')
    .populate('userId', 'firstName lastName email');
};

const AiAnalysis = mongoose.model('AiAnalysis', aiAnalysisSchema);

export default AiAnalysis;