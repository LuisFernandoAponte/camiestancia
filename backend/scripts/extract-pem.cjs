const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const certDir = path.resolve(__dirname, "..", "certs");
const pfxPath = path.join(certDir, "localhost.pfx");
const keyPath = path.join(certDir, "localhost.key");
const certPath = path.join(certDir, "localhost.crt");

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  process.exit(0);
}

if (!fs.existsSync(pfxPath)) {
  console.log("No PFX found, skipping cert extraction");
  process.exit(0);
}

const pfx = fs.readFileSync(pfxPath);
const p12 = new crypto.DiffieHellman(pfx);

// Extract using forge-like approach
// Node.js doesn't directly support PFX extraction in crypto
// Use openssl as subprocess or install node-forge
console.log("PFX found but Node.js cannot extract PEM directly.");
console.log("Run this command in terminal (requires OpenSSL):");
console.log(`  openssl pkcs12 -in "${pfxPath}" -nocerts -nodes -out "${keyPath}" -passin pass:password`);
console.log(`  openssl pkcs12 -in "${pfxPath}" -clcerts -nokeys -out "${certPath}" -passin pass:password`);
