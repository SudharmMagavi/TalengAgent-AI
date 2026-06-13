// server/models/Assessment.js
const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema(
    {
        hrId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User', // This locks the test so only the HR who created it can see it
            required: true 
        },
        candidateName: { 
            type: String, 
            required: true 
        },
        status: { 
            type: String, 
            enum: ['Pending', 'Completed'], 
            default: 'Pending' 
        },
        // --- NEW: Store the webcam snapshot ---
        candidatePhoto: { 
            type: String, 
            default: null 
        },
        // AI Data Storage
        resumeText: { type: String },
        candidateEmail: { 
            type: String, 
            required: true 
        },
        jobRole: { 
            type: String, 
            required: true 
        },
        uniqueToken: { 
            type: String, 
            required: true, 
            unique: true // This is the secret URL extension (e.g., /test/abc-123)
        },
        status: { 
            type: String, 
            enum: ['Pending', 'Completed'], 
            default: 'Pending' 
        },
        // AI Data Storage
        resumeText: { type: String },
        questions: { type: Array, default: [] },
        answers: { type: Array, default: [] },
        scorecard: { type: Object, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Assessment', assessmentSchema);