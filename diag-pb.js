import PocketBase from 'pocketbase';

const POCKETBASE_URL = 'https://pb.vonrodbox.eu';
const ADMIN_EMAIL = 'michaelschal@gmail.com';
const ADMIN_PASSWORD = 'Lapin2509';

const pb = new PocketBase(POCKETBASE_URL);

async function diagnose() {
    try {
        console.log(`[Diag] Connecting to ${POCKETBASE_URL}...`);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('[Diag] Authenticated.');

        // Create a DUMMY collection to see the structure
        console.log('\n[Diag] Creating dummy collection for inspection...');
        const dummyName = 'diag_test_' + Date.now();
        try {
            const dummy = await pb.collections.create({
                name: dummyName,
                type: 'base',
                fields: [
                    { name: 'test_field', type: 'text' },
                ],
            });
            console.log('✅ Dummy created!');
            console.log('Dummy ID:', dummy.id);
            console.log('Dummy Fields:', JSON.stringify(dummy.fields, null, 2));

            // Clean up
            await pb.collections.delete(dummy.id);
            console.log('✅ Dummy deleted.');
        } catch (e) {
            console.error('❌ Dummy creation failed:', e.message);
            if (e.data) console.error('   Data:', JSON.stringify(e.data, null, 2));
        }

        // Check and FIX public_playlists
        console.log('\n[Diag] Checking public_playlists...');
        try {
            const playlistColl = await pb.collections.getOne('public_playlists');
            if (!playlistColl.schema && !playlistColl.fields || (playlistColl.fields && playlistColl.fields.length <= 3)) {
                console.log('⚠️ public_playlists schema is MISSING or EMPTY. Fixing...');
                const playlistDef = {
                    fields: [
                        { name: 'uuid', type: 'text', required: true, unique: true },
                        { name: 'pb_user_id', type: 'text', required: true },
                        { name: 'title', type: 'text' },
                        { name: 'image', type: 'text' },
                        { name: 'description', type: 'text' },
                        { name: 'tracks', type: 'json' },
                        { name: 'data', type: 'json' },
                        { name: 'isPublic', type: 'bool' },
                    ],
                    listRule: '',
                    viewRule: '',
                    createRule: '@request.auth.id != ""',
                    updateRule: '@request.auth.id != ""',
                    deleteRule: '@request.auth.id != ""',
                };
                await pb.collections.update(playlistColl.id, playlistDef);
                console.log('✅ public_playlists fixed!');
            } else {
                console.log('✅ public_playlists seems fine.');
            }
        } catch (e) {
            console.error('❌ public_playlists diagnostic failed:', e.message);
        }

        console.log('\n[Diag] Retesting filter on pb_user_id...');
        try {
            const res = await pb.collection('DB_users').getList(1, 1, { filter: 'pb_user_id != ""' });
            console.log(`✅ Filter [pb_user_id != ""]: Success (${res.totalItems} items)`);
        } catch (e) {
            console.error(`❌ Filter [pb_user_id != ""]: FAILED (${e.status} ${e.message})`);
        }

    } catch (error) {
        console.error('[Diag] Fatal error:', error);
    }
}

diagnose();
