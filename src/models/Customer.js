import mongoose from 'mongoose';
import connectDB from '../lib/mongoose.js';

const customerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
        maxlength: [100, 'Customer name cannot exceed 100 characters']
    },
    url: {
        type: String,
        required: [true, 'Website URL is required'],
        trim: true,
    },
    lastScan: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'pending', 'inactive'],
        default: 'pending'
    },
    containerCount: {
        type: Number,
        default: 0,
        min: [0, 'Container count cannot be negative']
    },
    isMonitored: {
        type: Boolean,
        default: false
    },
    addedDate: {
        type: Date,
        default: Date.now
    },
    // Additional fields for future use
    scanHistory: [{
        scanDate: {
            type: Date,
            default: Date.now
        },
        containersFound: {
            type: Number,
            default: 0
        },
        scanResults: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }],
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    }
}, {
    timestamps: true
});

// Index for efficient querying
customerSchema.index({ userId: 1, createdAt: -1 });
customerSchema.index({ userId: 1, name: 1 });

// Static methods
customerSchema.statics.findByUserId = async function (userId) {
    await connectDB();
    return await this.find({ userId }).sort({ createdAt: -1 });
};

customerSchema.statics.createCustomer = async function (customerData) {
    await connectDB();
    const customer = new this(customerData);
    return await customer.save();
};

customerSchema.statics.updateLastScan = async function (customerId, scanData = {}) {
    await connectDB();
    const updateData = {
        lastScan: new Date(),
        ...scanData
    };
    
    // Add to scan history
    if (scanData.containersFound !== undefined) {
        await this.findByIdAndUpdate(
            customerId,
            {
                $push: {
                    scanHistory: {
                        scanDate: new Date(),
                        containersFound: scanData.containersFound,
                        scanResults: scanData.scanResults || {}
                    }
                }
            }
        );
    }
    
    return await this.findByIdAndUpdate(
        customerId,
        updateData,
        { new: true }
    );
};

customerSchema.statics.updateMonitoringStatus = async function (customerId, isMonitored) {
    await connectDB();
    return await this.findByIdAndUpdate(
        customerId,
        { isMonitored },
        { new: true }
    );
};

customerSchema.statics.getCustomerStats = async function (userId) {
    await connectDB();
    const stats = await this.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalCustomers: { $sum: 1 },
                activeCustomers: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                totalContainers: { $sum: '$containerCount' },
                monitoredCustomers: {
                    $sum: { $cond: ['$isMonitored', 1, 0] }
                }
            }
        }
    ]);
    
    return stats[0] || {
        totalCustomers: 0,
        activeCustomers: 0,
        totalContainers: 0,
        monitoredCustomers: 0
    };
};

customerSchema.methods.updateScanResults = async function (scanResults) {
    this.lastScan = new Date();
    if (scanResults.containerCount !== undefined) {
        this.containerCount = scanResults.containerCount;
    }
    if (scanResults.status !== undefined) {
        this.status = scanResults.status;
    }
    
    this.scanHistory.push({
        scanDate: new Date(),
        containersFound: scanResults.containerCount || 0,
        scanResults: scanResults
    });
    
    return await this.save();
};

customerSchema.virtual('displayUrl').get(function () {
    return this.url.replace(/^https?:\/\//, '');
});

customerSchema.virtual('daysSinceLastScan').get(function () {
    if (!this.lastScan) return null;
    const now = new Date();
    const diffTime = Math.abs(now - this.lastScan);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

customerSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        return ret;
    }
});

const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

export default Customer;