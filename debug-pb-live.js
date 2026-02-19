import PocketBase from 'pocketbase';

// Configuration
const POCKETBASE_URL = 'https://pb.vonrodbox.eu'; // URL publique
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

const pb = new PocketBase(POCKETBASE_URL);

async function debugSchema() {
    try {
        console.log(`[Debug] Connecting to ${POCKETBASE_URL}...`);

        // Authentification Admin
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('[Debug] Admin authenticated.');

        // 1. Inspecter la définition de la collection DB_users
        console.log('\n[Debug] Fetching DB_users collection definition...');
        try {
            const collection = await pb.collections.getOne('DB_users');
            console.log('--- DB_users Schema ---');
            console.log(JSON.stringify(collection.schema, null, 2));

            // Check specifically for pb_user_id
            const hasPbUserId = collection.schema.some(field => field.name === 'pb_user_id');
            console.log(`\n[Check] Field 'pb_user_id' exists? ${hasPbUserId ? 'YES' : 'NO'}`);

            if (!hasPbUserId) {
                console.error('[CRITICAL] existing schema is missing pb_user_id!');
            }

        } catch (error) {
            console.error('[Debug] Failed to fetch collection definition:', error.message);
        }

        // 2. Tenter une requête similaire à celle du client
        console.log('\n[Debug] Testing client query: filter=pb_user_id="..."');
        try {
            // Utiliser un ID fictif ou existant pour tester la syntaxe
            const result = await pb.collection('DB_users').getList(1, 1, {
                filter: 'pb_user_id="test_id"'
            });
            console.log('[Debug] Query success (empty result expected):', result);
        } catch (error) {
            console.error('[Debug] Query FAILED with 400 (likely schema issue):', error.originalError || error.message);
            // Si erreur 400, ça confirme que le champ n'existe pas ou n'est pas queryable
        }

    } catch (error) {
        console.error('[Debug] Fatal error:', error);
    }
}

debugSchema();
