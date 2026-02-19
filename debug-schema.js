import PocketBase from 'pocketbase';

const PB_URL = 'https://pb.vonrodbox.eu';
const ADMIN_EMAIL = 'michaelchal@gmail.com';
const ADMIN_PASSWORD = 'Lapin2509';

const pb = new PocketBase(PB_URL);

async function debugSchema() {
    try {
        console.log('Authenticating...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

        console.log('Fetching DB_users collection...');
        const col = await pb.collections.getOne('DB_users');

        console.log('--- DB_users Schema ---');
        console.log(JSON.stringify(col.schema, null, 2));

        const hasUserId = col.schema.find(f => f.name === 'pb_user_id');
        if (hasUserId) {
            console.log('✅ Field pb_user_id found!');
        } else {
            console.error('❌ Field pb_user_id MISSING!');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

debugSchema();
