const app = require('./app');
const connectDB = require('./config/db');

// Set Server Listening Port
const PORT = process.env.PORT || 5000;

// Connect to Database and Start Server Listener
const startServer = async () => {
  try {
    // 1. Establish MongoDB Connection
    await connectDB();

    // 2. Start Express HTTP Listener
    const server = app.listen(PORT, () => {
      console.log(
        `[Server] NARSS Dashboard Backend running in ${
          process.env.NODE_ENV || 'development'
        } mode on port ${PORT}`
      );
    });

    // Handle unhandled promise rejections gracefully
    process.on('unhandledRejection', (err) => {
      console.error(`[Unhandled Rejection Error]: ${err.message}`);
      // Close server & exit process
      server.close(() => process.exit(1));
    });
  } catch (err) {
    console.error(`[Server Initialization Error]: ${err.message}`);
    process.exit(1);
  }
};

startServer();
