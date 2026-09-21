const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const certDir = path.resolve(__dirname, "..", "certs");
const keyPath = path.join(certDir, "localhost.key");
const certPath = path.join(certDir, "localhost.crt");

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log("✅ Certs already exist, skipping generation");
  process.exit(0);
}

console.log("🔐 Generating self-signed certificate for localhost...");

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const cert = crypto.createCertificate();
cert.setPublicKey(publicKey);
cert.setPrivateKey(privateKey);
cert.setSerialNumber(Date.now().toString());

cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 5);

cert.subject = [
  { name: "commonName", value: "localhost" },
  { name: "organizationName", value: "La Estancia Guayaba Dev" },
];

cert.issuer = cert.subject;

cert.setExtensions([
  { name: "basicConstraints", cA: true },
  { name: "keyUsage", keyCertSign: true, digitalSignature: true, keyEncipherment: true },
  { name: "extKeyUsage", serverAuth: true },
  { name: "subjectAltName", altNames: [{ type: 2, value: "localhost" }, { type: 2, value: "127.0.0.1" }] },
]);

const pem = cert.sign(privateKey, crypto.createHash("sha256"));

fs.writeFileSync(keyPath, privateKey.export({ type: "pkcs1", format: "pem" }));
fs.writeFileSync(certPath, pem);

console.log(`✅ Certificate generated:
  - Key:  ${keyPath}
  - Cert: ${certPath}`);
console.log("⚠️  This is a self-signed cert for local development only.");
