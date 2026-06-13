// server/server.js
const express = require('express');
require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');

// <-- THE FIX: Import the exact file we were editing! -->
const authRoutes = require('./routes/authRoutes'); 
const interviewRoutes = require('./routes/interview'); 

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes); 
app.use('/api/interview', interviewRoutes); // <-- This now points to our updated file!

// Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is running' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});