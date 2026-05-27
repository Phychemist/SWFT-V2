const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Helper to load env variables from .env.local manually
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('Error: .env.local file not found!');
        process.exit(1);
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || '';
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.substring(1, value.length - 1);
            }
            env[key] = value.trim();
        }
    });
    return env;
}

async function main() {
    const env = loadEnv();
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Error: Missing Supabase URL or Key in .env.local!');
        process.exit(1);
    }

    console.log('Connecting to Supabase at:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch all users from the database
    console.log('\n--- Fetching users from public.users table ---');
    const { data: users, error } = await supabase
        .from('users')
        .select('id, username, full_name, role, is_active');

    if (error) {
        console.error('Error fetching users:', error.message);
        process.exit(1);
    }

    console.log(`Found ${users.length} users in the database:`);
    console.table(users);

    const accountantUser = users.find(u => u.username === 'accountant');

    if (!accountantUser) {
        console.log('\n[INFO] Accountant user NOT found in the database. Inserting it now...');
        // Hash password 'Accountant@1234' with 12 rounds
        const hashedPassword = await bcrypt.hash('Accountant@1234', 12);
        
        const { data: inserted, error: insertError } = await supabase
            .from('users')
            .insert({
                username: 'accountant',
                password_hash: hashedPassword,
                full_name: 'Test Accountant',
                role: 'accountant',
                is_active: true
            })
            .select();

        if (insertError) {
            console.error('Error inserting accountant user:', insertError.message);
        } else {
            console.log('Successfully inserted accountant user:', inserted);
        }
    } else {
        console.log('\n[INFO] Accountant user exists in the database.');
        console.log('Verifying its active status:', accountantUser.is_active ? 'Active (Good)' : 'Inactive (Needs to be enabled!)');
        
        if (!accountantUser.is_active) {
            console.log('Enabling accountant user...');
            const { error: updateError } = await supabase
                .from('users')
                .update({ is_active: true })
                .eq('username', 'accountant');
            if (updateError) {
                console.error('Error updating accountant user status:', updateError.message);
            } else {
                console.log('Accountant user successfully enabled!');
            }
        }

        // Let's reset the password hash just to be absolutely sure it matches 'Accountant@1234'
        console.log('Resetting password for accountant to "Accountant@1234" to be absolutely sure...');
        const hashedPassword = await bcrypt.hash('Accountant@1234', 12);
        const { error: resetError } = await supabase
            .from('users')
            .update({ password_hash: hashedPassword })
            .eq('username', 'accountant');

        if (resetError) {
            console.error('Error resetting password:', resetError.message);
        } else {
            console.log('Password successfully reset to Accountant@1234!');
        }
    }
}

main().catch(err => {
    console.error('Unhandled error:', err);
});
