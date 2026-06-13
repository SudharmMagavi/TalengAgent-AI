// server/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 1. Authentication Check (Are you who you say you are?)
const protect = async (req, res, next) => {
    let token;

    // Check if the authorization header exists and starts with 'Bearer'
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extract the token
            token = req.headers.authorization.split(' ')[1];

            // Verify the token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Fetch the user from the DB (excluding the password) and attach to req
            req.user = await User.findById(decoded.id).select('-password');
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// 2. Authorization Check (Do you have the correct enterprise permissions?)
const isOrganization = (req, res, next) => {
    if (req.user && req.user.role === 'organization') {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Organization level permissions required.' });
    }
};

module.exports = { protect, isOrganization };