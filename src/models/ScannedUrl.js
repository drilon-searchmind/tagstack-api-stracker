import mongoose from 'mongoose';
import connectDB from '../lib/mongoose.js';

// Delete the existing model to avoid caching issues
if (mongoose.models.ScannedUrl) {
    delete mongoose.models.ScannedUrl;
}

const scannedUrlSchema = new mongoose.Schema({
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
    requestedUrl: {
        type: String,
        required: [true, 'Requested URL is required'],
        trim: true
    },
    scanData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    scanDate: {
        type: Date,
        default: Date.now
    },
    scanDuration: {
        type: Number,
        default: 0
    },
    scanStatus: {
        type: String,
        enum: ['completed', 'partial', 'failed'],
        default: 'completed'
    },
    notes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
}, {
    timestamps: true,
    strict: false
});

scannedUrlSchema.index({ userId: 1, scanDate: -1 });
scannedUrlSchema.index({ customerId: 1, scanDate: -1 });
scannedUrlSchema.index({ userId: 1, customerId: 1, scanDate: -1 });

scannedUrlSchema.statics.findByCustomerId = async function (customerId, limit = 10) {
    await connectDB();
    return await this.find({ customerId })
        .sort({ scanDate: -1 })
        .limit(limit)
        .populate('customerId', 'name url')
        .populate('userId', 'firstName lastName email');
};

scannedUrlSchema.statics.findByUserId = async function (userId, limit = 20) {
    await connectDB();
    return await this.find({ userId })
        .sort({ scanDate: -1 })
        .limit(limit)
        .populate('customerId', 'name url')
        .populate('userId', 'firstName lastName email');
};

scannedUrlSchema.statics.createScan = async function (inputData) {
    await connectDB();
    
    const scanData = {
        gtmScan: inputData.gtmScan,
        containers: inputData.containers,
        containerScans: inputData.containerScans
    };
    
    const scan = new this({
        userId: inputData.userId,
        customerId: inputData.customerId,
        requestedUrl: inputData.requestedUrl,
        scanData: scanData,
        scanDuration: inputData.scanDuration || 0,
        scanStatus: 'completed'
    });
    
    return await scan.save();
};

scannedUrlSchema.methods.updateCustomerRecord = async function () {
    const Customer = mongoose.model('Customer');
    const containers = this.scanData?.containers || [];
    const containerCount = containers.length;
    
    await Customer.findByIdAndUpdate(
        this.customerId,
        {
            lastScan: this.scanDate,
            containerCount: containerCount,
            status: containerCount > 0 ? 'active' : 'pending',
            $push: {
                scanHistory: {
                    scanDate: this.scanDate,
                    containersFound: containerCount,
                    scanResults: {
                        status: this.scanStatus,
                        scanDuration: this.scanDuration
                    }
                }
            }
        }
    );
};

scannedUrlSchema.virtual('containers').get(function () {
    return this.scanData?.containers || [];
});

scannedUrlSchema.virtual('containerScans').get(function () {
    return this.scanData?.containerScans || [];
});

scannedUrlSchema.virtual('gtmScan').get(function () {
    return this.scanData?.gtmScan || {};
});

scannedUrlSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        return ret;
    }
});

const ScannedUrl = mongoose.model('ScannedUrl', scannedUrlSchema);

export default ScannedUrl;