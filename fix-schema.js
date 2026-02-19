import PocketBase from 'pocketbase';

// Configuration
const POCKETBASE_URL = process.env.PUBLIC_POCKETBASE_URL || 'https://pb.vonrodbox.eu';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'michaelschal@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Lapin2509';

const pb = new PocketBase(POCKETBASE_URL);

async function fixSchema() {
    console.log(`[Fix] Connecting to ${POCKETBASE_URL}...`);
    console.log(`[Fix] Using Admin: ${ADMIN_EMAIL}`);

    try {
        // 1. Authentification
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('[Fix] ✅ Authenticated as Admin.');

        // 2. Récupérer la collection DB_users
        const collection = await pb.collections.getOne('DB_users');
        console.log(`[Fix] ✅ Found collection 'DB_users' (ID: ${collection.id})`);

        // 3. Vérifier et corriger le schéma
        let schema = collection.schema || collection.fields || [];
        console.log(`[Fix] Field names: ${Array.isArray(schema) ? schema.map(f => f.name).join(', ') : 'N/A'}`);
        const hasPbUserId = Array.isArray(schema) && schema.some(f => f.name === 'pb_user_id');

        if (hasPbUserId) {
            console.log('[Fix] ✅ Field "pb_user_id" already exists.');
        } else {
            console.log('[Fix] ⚠️ Field "pb_user_id" is MISSING. Adding it...');
            schema.push({
                name: 'pb_user_id',
                type: 'text',
                required: true,
                unique: true,
                options: { min: null, max: null, pattern: '' }
            });

            // Update collection
            await pb.collections.update(collection.id, { schema: schema });
            console.log('[Fix] ✅ Schema updated successfully. "pb_user_id" added.');
        }

        // 4. Test Query
        console.log('[Fix] Testing query with pb_user_id filter...');
        try {
            await pb.collection('DB_users').getList(1, 1, { filter: 'pb_user_id="test"' });
            console.log('[Fix] ✅ Query works! (400 error resolved)');
        } catch (e) {
            console.error('[Fix] ❌ Query still fails:', e.message);
        }

    } catch (error) {
        if (error.status === 400 && error.message.includes('authenticate')) {
            console.error('\n[FATAL] Authentication Failed!');
            console.error('The default credentials are incorrect.');
            console.error('Please run this script with correct credentials:');
            console.error('  $env:ADMIN_EMAIL="your@email.com"; $env:ADMIN_PASSWORD="yourpassword"; node fix-schema.js');
        } else {
            console.error('[FATAL] Error:', error.message);
        }
    }
}

fixSchema();
