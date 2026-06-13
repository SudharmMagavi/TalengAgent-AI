// server/routes/interviewRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const { uploadResume } = require('../controllers/interviewController');

// Apply the `protect` middleware first to ensure the user is logged in
// Apply the `upload.single('resume')` middleware to parse the incoming file attached to the 'resume' key
router.post('/upload', upload.single('resume'), uploadResume);

module.exports = router;