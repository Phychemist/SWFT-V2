const bcrypt = require('bcryptjs');

async function generateHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 12);
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nRun this SQL in Supabase to update the admin password:');
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'admin';`);
}

generateHash();
