import PocketBase from 'pocketbase';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

// --- Configuration ---
// Permet de lire depuis process.env ou un fichier .env local (si chargé via dotenv, ici on fait simple)
const PB_URL = process.env.PUBLIC_POCKETBASE_URL || 'https://pb.vonrodbox.eu';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'michaelschal@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'Lapin2509';

console.log(`[Init] Cible : ${PB_URL}`);
console.log(`[Init] Admin : ${ADMIN_EMAIL}`);

const pb = new PocketBase(PB_URL);

async function init() {
    try {
        // 1. Authentification Admin
        console.log('[Init] Authentification admin...');
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('[Init] Authentifié.');

        // 2. Collection : DB_users
        // Stocke les données utilisateur (bibliothèque, historique, playlists privées)
        await ensureCollection({
            name: 'DB_users',
            type: 'base',
            schema: [
                {
                    name: 'pb_user_id',
                    type: 'text',
                    required: true,
                    unique: true,
                    options: { min: null, max: null, pattern: '' },
                },
                { name: 'library', type: 'json', required: false },
                { name: 'history', type: 'json', required: false },
                { name: 'user_playlists', type: 'json', required: false },
                { name: 'user_folders', type: 'json', required: false },
            ],
            // Règles de sécurité :
            // Seul un utilisateur authentifié peut créer/lire/modifier SES propres données
            // Mais ici c'est une table de mapping, donc on permet l'accès auth général pour simplifier
            // Idéalement : @request.auth.id != "" && pb_user_id = @request.auth.id
            // Pour l'instant on met authentifié global comme demandé par le code client actuel
            listRule: '@request.auth.id != ""',
            viewRule: '@request.auth.id != ""',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
        });

        // 3. Collection : public_playlists
        // Stocke les playlists partagées publiquement
        await ensureCollection({
            name: 'public_playlists',
            type: 'base',
            schema: [
                {
                    name: 'uuid',
                    type: 'text',
                    required: true,
                    unique: true,
                    options: { min: null, max: null, pattern: '' },
                },
                { name: 'pb_user_id', type: 'text', required: true, options: { min: null, max: null, pattern: '' } },
                { name: 'title', type: 'text', required: false, options: { min: null, max: null, pattern: '' } },
                { name: 'image', type: 'text', required: false, options: { min: null, max: null, pattern: '' } },
                { name: 'description', type: 'text', required: false, options: { min: null, max: null, pattern: '' } },
                { name: 'tracks', type: 'json', required: false }, // Liste des pistes
                { name: 'data', type: 'json', required: false }, // Métadonnées extra
                { name: 'isPublic', type: 'bool', required: false },
            ],
            // Règles de sécurité :
            // Lecture publique (règles vides = public)
            // Écriture : Authentifié seulement
            listRule: '',
            viewRule: '',
            createRule: '@request.auth.id != ""',
            updateRule: '@request.auth.id != ""',
            deleteRule: '@request.auth.id != ""',
        });

        console.log('[Init] 🎉 Initialisation terminée avec succès.');
    } catch (error) {
        console.error('[Init] Erreur fatale :', error);
        process.exit(1);
    }
}

/**
 * Vérifie si une collection existe, sinon la crée.
 * @param {Object} def Définition de la collection
 */
async function ensureCollection(def) {
    try {
        console.log(`[Init] Vérification de la collection '${def.name}'...`);

        // Tentative de récupération de la collection existante
        const existing = await pb.collections.getOne(def.name);
        console.log(`[Init] ✅ Collection '${def.name}' existe déjà (ID: ${existing.id}).`);

        // MISE À JOUR DU SCHÉMA
        // On force la mise à jour pour s'assurer que tous les champs requis (pb_user_id) sont présents.
        console.log(`[Init] 🔄 Mise à jour du schéma de '${def.name}'...`);
        await pb.collections.update(existing.id, def);
        console.log(`[Init] ✅ Schéma mis à jour avec succès.`);
    } catch (err) {
        if (err.status === 404) {
            console.log(`[Init] ⚠️ Collection '${def.name}' introuvable. Création...`);
            await pb.collections.create(def);
            console.log(`[Init] ✅ Collection '${def.name}' créée.`);
        } else {
            console.error(`[Init] Erreur sur la collection '${def.name}':`, err);
            throw err;
        }
    }
}

init();
