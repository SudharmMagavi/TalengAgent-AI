// server/controllers/authController.js
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new HR/Organization Account
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        // ADDED: Extract companyName from the request body
        const { name, companyName, email, password } = req.body;

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create the new HR user
        const user = await User.create({
            name,
            companyName, // Save the company name to the database
            email,
            password,
            role: 'organization' // Lock the role for the B2B dashboard
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                companyName: user.companyName, // Send back the company name
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data received' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate an HR Manager & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email and explicitly select the password field (since we hid it in the model)
        const user = await User.findOne({ email }).select('+password');

        // Verify user exists and password matches
        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                companyName: user.companyName, // Send back the company name
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser };