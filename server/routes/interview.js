// server/routes/interview.js
const express = require('express');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto'); 
const nodemailer = require('nodemailer'); 
const Assessment = require('../models/Assessment'); 
const { protect, isOrganization } = require('../middlewares/authMiddleware');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Enterprise Auto-Retry Function ---
const generateWithRetry = async (model, prompt, maxRetries = 3) => {
    let delay = 2000; 
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await model.generateContent(prompt);
        } catch (error) {
            if (error.status === 503 || error.status === 429) {
                console.log(`[WARNING] Gemini API Busy (Attempt ${i + 1}/${maxRetries}). Retrying in ${delay / 1000} seconds...`);
                if (i === maxRetries - 1) throw error; 
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; 
            } else {
                throw error; 
            }
        }
    }
};

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } 
});

// --- Configure the Email Transporter ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ==========================================
// 1. HR ROUTE: Upload Resume & Generate Test
// ==========================================
router.post('/upload', protect, isOrganization, upload.single('resume'), async (req, res) => {
    try {
        const { candidateName, candidateEmail, jobRole } = req.body;

        if (!candidateName || !candidateEmail || !jobRole) return res.status(400).json({ message: 'Candidate details required.' });
        if (!req.file || req.file.mimetype !== 'application/pdf') return res.status(400).json({ message: 'Valid PDF required.' });

        const parser = new PDFParse({ data: req.file.buffer });
        const pdfData = await parser.getText();
        const resumeText = pdfData.text;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        console.log("=== STARTING AI GENERATION: DEMANDING 15 QUESTIONS ===");

        const prompt = `
            You are an expert Enterprise Technical Recruiter. Analyze this resume and generate a rigorous 15-question assessment for a ${jobRole} role.
            
            CRITICAL INSTRUCTION: You MUST generate exactly 15 questions. Do not stop at 5. If the resume is short, infer general industry questions to reach exactly 15.
            
            The assessment MUST include exactly:
            - 5 "Technical" questions
            - 3 "Coding" questions (Write a JavaScript function that...)
            - 4 "Logical" questions (problem-solving scenarios)
            - 3 "Verbal" questions (client communication)

            Return ONLY valid JSON in this exact structure: 
            { "questions": [ { "category": "Coding", "question": "..." } ] }
            
            RESUME: ${resumeText}
        `;

        const result = await generateWithRetry(model, prompt);
        const cleanedText = result.response.text().replace(/[`]{3}json/g, '').replace(/[`]{3}/g, '').trim();
        const aiData = JSON.parse(cleanedText);
        
        console.log(`=== AI FINISHED: GENERATED ${aiData.questions.length} QUESTIONS ===`);

        const uniqueToken = crypto.randomBytes(16).toString('hex');

        const assessment = await Assessment.create({
            hrId: req.user._id,
            candidateName,
            candidateEmail, 
            jobRole,
            uniqueToken,
            resumeText,
            questions: aiData.questions,
            status: 'Pending'
        });

        const testLink = `${process.env.CLIENT_URL}/take-test/${assessment.uniqueToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: candidateEmail,
            subject: `Action Required: Technical Assessment for ${jobRole}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                    <div style="background-color: #1e293b; padding: 20px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0;">Technical Assessment Invitation</h2>
                    </div>
                    <div style="padding: 30px; background-color: #ffffff; color: #334155;">
                        <p style="font-size: 16px;">Hello <strong>${candidateName}</strong>,</p>
                        <p style="font-size: 16px; line-height: 1.5;">You have been selected to proceed to the next technical evaluation phase for the <strong>${jobRole}</strong> position.</p>
                        
                        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 25px 0;">
                            <h4 style="margin: 0 0 10px 0; color: #1e293b;">Important Instructions:</h4>
                            <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                                <li>You will have exactly <strong>45 minutes</strong> to complete this test.</li>
                                <li>The environment is strictly proctored. You must remain in full-screen mode.</li>
                                <li>Copying and pasting are disabled.</li>
                            </ul>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${testLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Start Assessment Now</a>
                        </div>
                        
                        <p style="font-size: 14px; color: #64748b; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                            If the button above does not work, copy and paste this link into your browser:<br>
                            <a href="${testLink}" style="color: #2563eb;">${testLink}</a>
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`=== EMAIL SUCCESSFULLY SENT TO ${candidateEmail} ===`);

        res.status(201).json({
            message: 'Assessment Created and Email Sent',
            candidateLink: `/take-test/${assessment.uniqueToken}`
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: 'Server error processing resume.' });
    }
});

// ==========================================
// 2. HR ROUTE: Get All Assessments
// ==========================================
router.get('/dashboard', protect, isOrganization, async (req, res) => {
    try {
        const assessments = await Assessment.find({ hrId: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json(assessments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard data.' });
    }
});

// ==========================================
// 3. CANDIDATE ROUTE: Fetch Test by Token
// ==========================================
router.get('/assessment/:token', async (req, res) => {
    try {
        const assessment = await Assessment.findOne({ uniqueToken: req.params.token });
        
        if (!assessment) return res.status(404).json({ message: 'Invalid or expired link.' });
        if (assessment.status === 'Completed') return res.status(400).json({ message: 'This assessment has already been completed.' });

        res.status(200).json({
            candidateName: assessment.candidateName,
            jobRole: assessment.jobRole,
            questions: assessment.questions
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assessment.' });
    }
});

// ==========================================
// 4. CANDIDATE ROUTE: Submit & Grade Answers
// ==========================================
router.post('/grade/:token', async (req, res) => {
    try {
        // --- NEW: Extract photo from the request body ---
        const { answers, photo } = req.body;
        const assessment = await Assessment.findOne({ uniqueToken: req.params.token });

        if (!assessment) return res.status(404).json({ message: 'Assessment not found.' });
        if (assessment.status === 'Completed') return res.status(400).json({ message: 'Assessment already completed.' });

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        
        const prompt = `
            You are a strict Enterprise Hiring Manager evaluating a candidate for a ${assessment.jobRole} role.
            Evaluate these 15 responses based on:
            1. Code Quality & Syntax (for coding questions).
            2. Technical correctness.
            3. Logical problem-solving.
            4. Verbal clarity.
            
            Return ONLY a valid JSON object:
            {
                "overallScore": 85,
                "summary": "2-3 sentence summary of their coding ability, technical depth, and logic.",
                "detailedFeedback": [ { "question": "...", "score": 8, "feedback": "..." } ]
            }
            QUESTIONS: ${JSON.stringify(assessment.questions)}
            ANSWERS: ${JSON.stringify(answers)}
        `;

        const result = await model.generateContent(prompt);
        const cleanedText = result.response.text().replace(/[`]{3}json/g, '').replace(/[`]{3}/g, '').trim();
        const scorecard = JSON.parse(cleanedText);

        assessment.answers = answers;
        assessment.scorecard = scorecard;
        // --- NEW: Save the webcam image string to the database ---
        if (photo) {
            assessment.candidatePhoto = photo; 
        }
        assessment.status = 'Completed';
        await assessment.save();

        res.status(200).json({ message: 'Assessment submitted and graded successfully.' });

    } catch (error) {
        console.error("Grading Error:", error);
        res.status(500).json({ message: 'Server error during grading.' });
    }
});

module.exports = router;