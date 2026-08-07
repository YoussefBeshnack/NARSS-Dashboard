const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const documentRoutes = require('./routes/documentRoutes');
const publicationRoutes = require('./routes/publicationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Import Custom Error Middlewares
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// Security HTTP Headers
app.use(helmet());

// Enable Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: '*', // Customize allowed origins for production as needed
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body Parser Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Media & Files statically
const uploadDir = path.join(__dirname, process.env.UPLOAD_PATH || 'uploads');
app.use('/uploads', express.static(uploadDir));

// API Health Check & Root Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'NARSS Research Dashboard API Backend is operational',
    timestamp: new Date().toISOString(),
  });
});

// Register API Domain Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Catch 404 Routes and Forward to Error Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
