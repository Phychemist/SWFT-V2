const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables from .env.local
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

    // List of users to seed
    const usersToSeed = [
        {
            id: '911cc360-556e-4c75-8898-46c5d52c7714',
            username: 'admin',
            password: 'admin123',
            full_name: 'System Administrator',
            role: 'admin',
            is_active: true
        },
        {
            id: 'cd9bb8df-bdf2-4904-91c0-2a9650b86984',
            username: 'manager',
            password: 'manager',
            full_name: 'System Manager',
            role: 'manager',
            is_active: true
        },
        {
            id: 'f0871447-a937-48e2-8c29-53ac8038435d',
            username: 'customer-success',
            password: 'customer-success',
            full_name: 'Customer Success Specialist',
            role: 'customer_success',
            is_active: true
        },
        {
            id: '14613ce2-2c6e-4668-b9ee-e169c66efb5e',
            username: 'officer',
            password: 'officer',
            full_name: 'Backoffice Officer',
            role: 'officer_backoffice',
            is_active: true
        },
        {
            id: '19830a50-e414-45ea-bf70-afa4ed1ea247',
            username: 'scientist',
            password: 'scientist',
            full_name: 'Lead Scientist',
            role: 'scientist',
            is_active: true
        },
        {
            id: 'f5d71744-369d-46f0-826c-043d874094de',
            username: 'accountant',
            password: 'Accountant@1234',
            full_name: 'Test Accountant',
            role: 'accountant',
            is_active: true
        },
        // Field Executives
        {
            id: 'd8026c45-55ca-444d-88c8-3a4c1c728e09',
            username: '9924980141',
            password: 'fe123',
            full_name: 'Irfan (FE)',
            role: 'field_executive',
            is_active: true
        },
        {
            id: '9d17be66-8ab6-40d0-bd67-788d047f8140',
            username: '9723649936',
            password: 'fe123',
            full_name: 'Chirag (FE)',
            role: 'field_executive',
            is_active: true
        },
        {
            id: '9102e844-6f80-4813-b450-46f65372ec17',
            username: '8197492126',
            password: 'fe123',
            full_name: 'Manu (FE)',
            role: 'field_executive',
            is_active: true
        },
        {
            id: '89dcf27e-9bb5-46b0-80be-f03aacd9547e',
            username: '8971211450',
            password: 'fe123',
            full_name: 'Sharath (FE)',
            role: 'field_executive',
            is_active: true
        },
        {
            id: '2a20ad97-18f8-4299-a2fb-b2dd380583e4',
            username: '9159580455',
            password: 'fe123',
            full_name: 'Sugumar (FE)',
            role: 'field_executive',
            is_active: true
        }
    ];

    console.log('\n--- Seeding Users Table ---');

    for (const u of usersToSeed) {
        console.log(`Processing user: "${u.username}" (Role: ${u.role})...`);
        const hashedPassword = await bcrypt.hash(u.password, 12);
        
        // Use upsert to insert or overwrite
        const { data, error } = await supabase
            .from('users')
            .upsert({
                id: u.id,
                username: u.username,
                password_hash: hashedPassword,
                full_name: u.full_name,
                role: u.role,
                is_active: u.is_active,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'username'
            })
            .select();

        if (error) {
            console.error(`❌ Error seeding user ${u.username}:`, error.message);
        } else {
            console.log(`✅ Success seeding user ${u.username} with password "${u.password}"`);
        }
    }

    console.log('\nDatabase user seeding completed successfully!');
}

main().catch(err => {
    console.error('Unhandled error:', err);
});
