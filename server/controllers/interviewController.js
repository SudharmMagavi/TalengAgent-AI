// server/controllers/interviewController.js
const pdfParse = require('pdf-extraction'); // <-- Using the modern package!
const { generateInterviewQuestions } = require('../services/aiService');

// @desc    Upload resume, extract text, and generate questions
// @route   POST /api/interview/upload
// @access  Public (temporarily bypassed for testing)
const uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a PDF resume' });
        }

        // 1. Extract Text
        const pdfData = await pdfParse(req.file.buffer);
        const extractedText = pdfData.text;

        if (!extractedText || extractedText.trim() === '') {
            return res.status(400).json({ message: 'Could not extract text. It might be a scanned image.' });
        }

        // 2. Pass text to AI service to generate questions
        const questions = await generateInterviewQuestions(extractedText);

        // 3. Return the generated questions
        res.status(200).json({
            message: 'Questions generated successfully',
            questions: questions
        });

    } catch (error) {
        console.error('Error in upload pipeline:', error);
        res.status(500).json({ message: 'Server error during interview generation' });
    }
};

module.exports = { uploadResume };