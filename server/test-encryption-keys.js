const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

// Common encryption key patterns to try
const candidateKeys = [
  'your-32-character-encryption-key-here',
  'your-strong-and-secret-encryption-key-here',
  'dev-encryption-key-for-localhost-development-only',
  'mirabel-encryption-key-2024',
  'nectar-api-encryption-key',
  'jcoler-encryption-key',
  'encryption-key-nectar-api',
  'Fr33d0M!!@!',
  'mirabel2024',
  'encryption123',
  'mirabeltechnologies',
  'your-encryption-key-here',
  'default-encryption-key',
  'test-encryption-key',
  'localhost-encryption-key',
];

function createKey(password) {
  return crypto.createHash('sha256').update(String(password)).digest();
}

function tryDecrypt(encryptedData, key) {
  try {
    const [encryptedHex, ivHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (error) {
    return null;
  }
}

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const connections = mongoose.connection.db.collection('connections');
    const conn = await connections.findOne({ password: { $exists: true, $ne: '' } });

    if (conn && conn.password) {
      console.log('Testing encryption keys against encrypted password...');
      console.log('Encrypted password format:', conn.password.substring(0, 50) + '...');
      console.log('');

      let found = false;
      for (const candidate of candidateKeys) {
        console.log(`Testing key: "${candidate}"`);
        const key = createKey(candidate);
        const decrypted = tryDecrypt(conn.password, key);

        if (decrypted && decrypted.length > 0 && !decrypted.includes('\uFFFD')) {
          console.log('✅ FOUND WORKING KEY:', candidate);
          console.log('✅ Decrypted password:', decrypted);
          found = true;
          break;
        }
      }

      if (!found) {
        console.log('❌ None of the candidate keys worked');
        console.log('You may need to remember the original encryption key you used');
      }
    } else {
      console.log('No encrypted passwords found to test against');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
};

connect();
