// // server/services/aiService.js
// const { GoogleGenerativeAI } = require('@google/generative-ai');

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// const generateInterviewQuestions = async (resumeText) => {
//     // We use gemini-1.5-flash as it is highly efficient for text extraction and generation
//     const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

//     const prompt = `
//         You are an expert technical interviewer for Zensar. Analyze the following resume text and generate a structured interview.

//         Instructions:
//         1. Determine the candidate's work experience. If they have 0 years (fresher), set the difficulty to beginner and focus on foundational technical concepts, English, and logical reasoning.
//         2. If they have experience (> 0 years), set the difficulty to intermediate/advanced and focus heavily on scenario-based technical questions using the specific tools mentioned in their resume.
//         3. Generate exactly 5 questions based on these criteria.

//         You MUST return the output STRICTLY as a valid JSON array of objects with the following keys. Do not include markdown formatting like \`\`\`json.
//         - "question": The actual interview question.
//         - "category": "Technical", "Verbal", or "Logical".
//         - "expectedAnswerKeyPoints": A brief string of what a good answer should include (we will use this for automated grading later).

//         Resume Text:
//         """${resumeText}"""
//     `;

//     try {
//         const result = await model.generateContent(prompt);
//         const response = await result.response;
//         let text = response.text();

//         // Clean up markdown formatting if the AI includes it by accident
//         text = text.replace(/```json/g, '').replace(/```/g, '').trim();

//         return JSON.parse(text);
//     } catch (error) {
//         console.error("AI Generation Error:", error);
//         throw new Error("Failed to generate questions from AI");
//     }
// };

// module.exports = { generateInterviewQuestions };

// server/services/aiService.js

/**
 * Mock implementation of the AI service to allow testing 
 * the complete file upload pipeline without an active Gemini API Key.
 */
const generateInterviewQuestions = async (resumeText) => {
    // Convert text to lowercase for simple keyword matching
    const lowerText = resumeText.toLowerCase();

    // Simple heuristic to determine experience level
    let isFresher = true;
    if (
        lowerText.includes('years of experience') ||
        lowerText.includes('experience:') ||
        lowerText.includes('worked as') ||
        lowerText.includes('developer for')
    ) {
        isFresher = false;
    }

    // Simulate network latency (500ms) to mimic a real API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (isFresher) {
        // Return a structured beginner/fresher interview
        return [
            {
                "question": "Can you explain the difference between 'let', 'const', and 'var' in JavaScript?",
                "category": "Technical",
                "expectedAnswerKeyPoints": "Block scope vs function scope, hoisting differences, re-assignment capabilities of let vs immutability of const references."
            },
            {
                "question": "Describe a situation where you had to work in a team to solve a problem. How did you handle conflicts?",
                "category": "Verbal",
                "expectedAnswerKeyPoints": "Active listening, compromise, professional communication, focusing on project goals over personal opinions."
            },
            {
                "question": "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?",
                "category": "Logical",
                "expectedAnswerKeyPoints": "The ball costs 5 cents ($0.05). Tests foundational algebraic logic and attention to detail."
            },
            {
                "question": "What is the purpose of an index in a database like MongoDB?",
                "category": "Technical",
                "expectedAnswerKeyPoints": "Improves query execution performance, prevents full collection scans, speeds up lookups at the cost of write performance."
            },
            {
                "question": "How do you ensure your code remains readable and maintainable for other developers?",
                "category": "Verbal",
                "expectedAnswerKeyPoints": "Consistent naming conventions, meaningful comments where logic is complex, writing modular code, and following documentation practices."
            }
        ];
    } else {
        // Return a structured intermediate/experienced interview
        return [
            {
                "question": "How would you optimize a slow-performing MERN stack application experiencing high database read latency?",
                "category": "Technical",
                "expectedAnswerKeyPoints": "Implementing Redis caching, optimizing MongoDB indexes, using projection to return only necessary fields, checking network bottlenecks."
            },
            {
                "question": "Explain how you would secure a Node.js REST API against common vulnerabilities like SQL/NoSQL injection and XSS.",
                "category": "Technical",
                "expectedAnswerKeyPoints": "Using express-mongo-sanitize, data validation with Zod/Joi, utilizing security headers via Helmet, and sanitizing inputs."
            },
            {
                "question": "Tell me about a time you had to optimize or refactor a legacy codebase. What was your approach and the outcome?",
                "category": "Verbal",
                "expectedAnswerKeyPoints": "Assessing existing architectural debt, writing tests before rewriting code, incremental refactoring to avoid breaking production, monitoring performance gains."
            },
            {
                "question": "If an API endpoint suddenly spikes in error rates (500 Internal Server Errors) during peak hours, walk me through your debugging steps.",
                "category": "Logical",
                "expectedAnswerKeyPoints": "Checking server logs (Morgan/Winston), verifying database connection pool limits, analyzing recent deployment diffs, reviewing CPU/Memory usage metrics."
            },
            {
                "question": "How do you handle architectural disagreements within a development team when picking a technology stack?",
                "category": "Verbal",
                "expectedAnswerKeyPoints": "Data-driven decision making, building small proofs-of-concept (POCs), aligning choices with business requirements, and respecting team consensus."
            }
        ];
    }
};

module.exports = { generateInterviewQuestions };