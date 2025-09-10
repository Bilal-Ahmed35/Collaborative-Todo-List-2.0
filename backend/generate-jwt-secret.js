// generate-jwt-secret.js
// Run this script to generate a proper JWT secret
// Usage: node generate-jwt-secret.js

const crypto = require("crypto");

console.log("\n🔐 JWT Secret Generator\n");
console.log("Copy one of these secrets to your backend .env file:\n");

// Generate 3 different options
for (let i = 1; i <= 3; i++) {
  const secret = crypto.randomBytes(64).toString("hex");
  console.log(`Option ${i}:`);
  console.log(`JWT_SECRET=${secret}\n`);
}

console.log("💡 Tips:");
console.log("1. Use a secret that is at least 32 characters long");
console.log("2. Keep it secure and never commit it to version control");
console.log("3. Use different secrets for development and production");
console.log("4. Restart your backend server after changing the secret\n");

// Also generate a base64 encoded version
const base64Secret = crypto.randomBytes(32).toString("base64");
console.log(`Base64 Option: JWT_SECRET=${base64Secret}\n`);
