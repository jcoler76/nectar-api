const crypto = require('crypto');

const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

// Helper function to derive a 32-byte key from the environment variable
const getKey = () => {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  return crypto.createHash('sha256').update(String(secret)).digest();
};

const decryptDatabasePassword = encryptedPassword => {
  try {
    if (!encryptedPassword || typeof encryptedPassword !== 'string') {
      throw new Error('Invalid password: must be a non-empty string');
    }

    if (!encryptedPassword.includes(':')) {
      throw new Error('Invalid encrypted password format - missing delimiter');
    }

    // Decrypt the encrypted password
    const [encryptedHex, ivHex] = encryptedPassword.split(':');
    const key = getKey();

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error details:', {
      message: error.message,
      stack: error.stack,
      encryptedPasswordLength: encryptedPassword?.length,
      encryptedPasswordType: typeof encryptedPassword,
      hasDelimiter: encryptedPassword?.includes?.(':'),
      encryptionKeyExists: !!process.env.ENCRYPTION_KEY,
    });
    throw new Error('Failed to decrypt password: ' + error.message);
  }
};

const encryptDatabasePassword = password => {
  try {
    if (!password || typeof password !== 'string') {
      throw new Error('Invalid password format: ' + typeof password);
    }

    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(password);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return encrypted.toString('hex') + ':' + iv.toString('hex');
  } catch (error) {
    console.error('Encryption error details:', {
      message: error.message,
      stack: error.stack,
      passwordLength: password?.length,
      passwordType: typeof password,
      encryptionKeyExists: !!process.env.ENCRYPTION_KEY,
    });
    throw new Error('Failed to encrypt password: ' + error.message);
  }
};

const generateApiKey = async () => {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(32, (err, buffer) => {
      if (err) reject(err);
      resolve(buffer.toString('hex'));
    });
  });
};

const encryptApiKey = apiKey => {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key format: ' + typeof apiKey);
    }

    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(apiKey);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return encrypted.toString('hex') + ':' + iv.toString('hex');
  } catch (error) {
    console.error('API key encryption error details:', {
      message: error.message,
      stack: error.stack,
      apiKeyLength: apiKey?.length,
      apiKeyType: typeof apiKey,
      encryptionKeyExists: !!process.env.ENCRYPTION_KEY,
    });
    throw new Error('Failed to encrypt API key: ' + error.message);
  }
};

const decryptApiKey = encryptedApiKey => {
  try {
    if (!encryptedApiKey || typeof encryptedApiKey !== 'string' || !encryptedApiKey.includes(':')) {
      throw new Error('Invalid encrypted API key format');
    }

    const [encryptedHex, ivHex] = encryptedApiKey.split(':');
    const key = getKey();

    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (error) {
    console.error('API key decryption error details:', {
      message: error.message,
      stack: error.stack,
      encryptedApiKeyLength: encryptedApiKey?.length,
      encryptedApiKeyType: typeof encryptedApiKey,
      hasDelimiter: encryptedApiKey?.includes?.(':'),
      encryptionKeyExists: !!process.env.ENCRYPTION_KEY,
    });
    throw new Error('Failed to decrypt API key: ' + error.message);
  }
};

module.exports = {
  encryptDatabasePassword,
  decryptDatabasePassword,
  encryptApiKey,
  decryptApiKey,
  generateApiKey,
};
