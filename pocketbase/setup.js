/**
 * PocketBase Collection Setup Script
 * 
 * Run this AFTER starting PocketBase for the first time and creating a superuser account.
 * Usage: node setup.js <superuser-email> <superuser-password>
 * 
 * This script creates the 'monitors' and 'ping_logs' collections.
 */

import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';

async function setup() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error('Usage: node setup.js <superuser-email> <superuser-password>');
        process.exit(1);
    }

    const pb = new PocketBase(PB_URL);

    try {
        // Authenticate as superuser
        console.log('🔐 Authenticating as superuser...');
        await pb.collection('_superusers').authWithPassword(email, password);
        console.log('✅ Authenticated!\n');

        // Check if collections already exist
        let existingCollections = [];
        try {
            const list = await pb.collections.getFullList();
            existingCollections = list.map(c => c.name);
        } catch (e) {}

        // ===== Create 'monitors' collection =====
        if (existingCollections.includes('monitors')) {
            console.log('⚠️  Collection "monitors" already exists. Skipping.');
        } else {
            console.log('📦 Creating "monitors" collection...');
            await pb.collections.create({
                name: 'monitors',
                type: 'base',
                fields: [
                    {
                        name: 'user',
                        type: 'relation',
                        required: true,
                        collectionId: '_pb_users_auth_',
                        cascadeDelete: true,
                        maxSelect: 1,
                        minSelect: 1
                    },
                    {
                        name: 'name',
                        type: 'text',
                        required: true,
                        min: 1,
                        max: 200
                    },
                    {
                        name: 'target_host',
                        type: 'text',
                        required: true,
                        min: 1,
                        max: 255
                    },
                    {
                        name: 'interval_ms',
                        type: 'number',
                        required: true,
                        min: 500,
                        max: 60000
                    },
                    {
                        name: 'alert_threshold_sec',
                        type: 'number',
                        required: true,
                        min: 1,
                        max: 300
                    },
                    {
                        name: 'status',
                        type: 'select',
                        required: true,
                        values: ['running', 'stopped'],
                        maxSelect: 1
                    }
                ],
                listRule: 'user = @request.auth.id',
                viewRule: 'user = @request.auth.id',
                createRule: '@request.auth.id != "" && user = @request.auth.id',
                updateRule: 'user = @request.auth.id',
                deleteRule: 'user = @request.auth.id'
            });
            console.log('✅ "monitors" collection created!\n');
        }

        // ===== Create 'ping_logs' collection =====
        if (existingCollections.includes('ping_logs')) {
            console.log('⚠️  Collection "ping_logs" already exists. Skipping.');
        } else {
            // Get monitors collection ID for relation
            const monitorsCollection = await pb.collections.getOne('monitors');

            console.log('📦 Creating "ping_logs" collection...');
            await pb.collections.create({
                name: 'ping_logs',
                type: 'base',
                fields: [
                    {
                        name: 'monitor',
                        type: 'relation',
                        required: true,
                        collectionId: monitorsCollection.id,
                        cascadeDelete: true,
                        maxSelect: 1,
                        minSelect: 1
                    },
                    {
                        name: 'latency_ms',
                        type: 'number',
                        required: false,
                        min: 0
                    },
                    {
                        name: 'is_packet_loss',
                        type: 'bool',
                        required: false
                    }
                ],
                listRule: 'monitor.user = @request.auth.id',
                viewRule: 'monitor.user = @request.auth.id',
                createRule: null,  // Only backend/admin can create
                updateRule: null,
                deleteRule: null
            });
            console.log('✅ "ping_logs" collection created!\n');
        }

        console.log('🎉 Setup complete! Collections are ready.');
        console.log('   - monitors: stores ping target configurations');
        console.log('   - ping_logs: stores ping results (created by worker)');
        console.log('\nNext steps:');
        console.log('   1. cd ../frontend && npm run dev');
        console.log('   2. cd ../worker && npm start');

    } catch (err) {
        console.error('❌ Error:', err.message || err);
        if (err.data) console.error('   Details:', JSON.stringify(err.data, null, 2));
        process.exit(1);
    }
}

setup();
