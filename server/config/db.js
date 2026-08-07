const mongoose = require('mongoose');
const dns = require('dns');

// Enforce IPv4 DNS resolution order first across Node.js network calls
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Establishes connection to MongoDB database via Mongoose ODM.
 * Features automatic fallback to local MongoDB if Atlas cloud connection is blocked.
 */
const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/narss_dashboard';
  const fallbackLocalUri = 'mongodb://127.0.0.1:27017/narss_dashboard';

  const connectionOptions = {
    family: 4,
    serverSelectionTimeoutMS: 6000,
    connectTimeoutMS: 6000,
  };

  // Attempt 1: Connect to configured MONGO_URI
  try {
    console.log(`[Database] Attempting connection to MongoDB...`);
    const conn = await mongoose.connect(primaryUri, connectionOptions);
    console.log(`[Database] MongoDB Connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (primaryError) {
    console.error(`[Database Error] Primary connection failed: ${primaryError.message}`);

    // If primary is not local, try fallback to local MongoDB if available
    if (!primaryUri.includes('127.0.0.1') && !primaryUri.includes('localhost')) {
      console.log(`[Database] Attempting fallback connection to local MongoDB (127.0.0.1:27017)...`);
      try {
        const localConn = await mongoose.connect(fallbackLocalUri, connectionOptions);
        console.log(`[Database] Local MongoDB connected successfully: ${localConn.connection.host}`);
        return localConn;
      } catch (localError) {
        console.error(`[Database Error] Local fallback also failed: ${localError.message}`);
      }
    }

    console.error(`
===========================================================================
⚠️  MONGODB CONNECTION DIAGNOSTIC SUMMARY
===========================================================================
1. Atlas Firewall / Whitelist Issue:
   Although '0.0.0.0/0' may be listed in MongoDB Atlas Network Access, 
   check if the entry has EXPIRED or needs to be re-saved.
2. Network / ISP Port 27017 Blocked:
   Your Wi-Fi, ISP, VPN, or local firewall is blocking outbound TCP port 27017.
   - Solution A: Switch to a mobile hotspot or different Wi-Fi network.
   - Solution B: Install & start local MongoDB (mongod) on port 27017.
   - Solution C: Use MongoDB Atlas connection string with port 443 / standard HTTPS proxy.
===========================================================================
    `);

    // Exit process so nodemon displays diagnostic error
    process.exit(1);
  }
};

module.exports = connectDB;
