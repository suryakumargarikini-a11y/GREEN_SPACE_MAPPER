const mongoose = require('mongoose');

/**
 * Schema for a single green space entry.
 * Facilities are stored as an array of strings (e.g. ['playground','benches']).
 * Images are stored as a URL string from Firebase Storage.
 */
const spaceSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        description: {
            type: String,
            default: '',
        },
        location: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true },
        },
        area: {
            type: String, // e.g. "5 acres"
            default: '',
        },
        facilities: {
            type: [String], // e.g. ['playground', 'benches', 'walking_track']
            default: [],
        },
        imageUrl: {
            type: String,
            default: '',
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Space', spaceSchema);
