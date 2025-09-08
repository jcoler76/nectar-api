const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = '<password>';
  const saltRounds = 12;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    // Verify the hash works
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash validation:', isValid ? '✅ Valid' : '❌ Invalid');
  } catch (error) {
    console.error('Error:', error);
  }
}

generateHash();