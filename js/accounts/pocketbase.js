// js/accounts/pocketbase.js
// PocketBase data synchronisation layer.
// Auth is now handled entirely by PocketBase SDK (pb.authStore).
// The firebase_id field has been replaced by pb_user_id (= pb.authStore.model.id).

import { pb } from './pocketbase-client.js';
import { db } from '../db.js';

const PUBLIC_COLLECTION = 'public_playlists';

/**
 * Return the authenticated PocketBase user record, or null.
 * @returns {import('pocketbase').RecordModel | null}
 */
function getCurrentUser() {
    return pb.authStore.isValid ? pb.authStore.model : null;
}

const syncManager = {
    pb: pb,
    _userRecordCache: null,
    _isSyncing: false,

    /**
     * Fetch or create the DB_users record for the given PocketBase user id.
     * @param {string} pbUserId - The PocketBase user record id (pb.authStore.model.id)
     * @returns {Promise<import('pocketbase').RecordModel | null>}
     */
    async _getUserRecord(pbUserId) {
        if (!pbUserId) return null;

        if (this._userRecordCache && this._userRecordCache.pb_user_id === pbUserId) {
            return this._userRecordCache;
        }

        try {
            const record = await this.pb.collection('DB_users').getFirstListItem(`pb_user_id="${pbUserId}"`);
            this._userRecordCache = record;
            return record;
        } catch (error) {
            if (error.status === 404) {
                try {
                    const newRecord = await this.pb.collection('DB_users').create({
                        pb_user_id: pbUserId,
                        library: {},
                        history: [],
                        user_playlists: {},
                        user_folders: {},
                    });
                    this._userRecordCache = newRecord;
                    return newRecord;
                } catch (createError) {
                    console.error('[PocketBase] Failed to create user record:', createError);
                    return null;
                }
            }
            console.error('[PocketBase] Failed to get user record:', error);
            return null;
        }
    },

    async getUserData() {
        const user = getCurrentUser();
        if (!user) return null;

        const record = await this._getUserRecord(user.id);
        if (!record) return null;

        const library = this.safeParseInternal(record.library, 'library', {});
        const history = this.safeParseInternal(record.history, 'history', []);
        const userPlaylists = this.safeParseInternal(record.user_playlists, 'user_playlists', {});
        const userFolders = this.safeParseInternal(record.user_folders, 'user_folders', {});

        return { library, history, userPlaylists, userFolders };
    },

    /**
     * @param {string} pbUserId
     * @param {string} field
     * @param {unknown} data
     */
    async _updateUserJSON(pbUserId, field, data) {
        const record = await this._getUserRecord(pbUserId);
        if (!record) {
            console.error('[PocketBase] Cannot update: no user record found');
            return;
        }

        try {
            const stringifiedData = typeof data === 'string' ? data : JSON.stringify(data);
            const updated = await this.pb.collection('DB_users').update(record.id, { [field]: stringifiedData });
            this._userRecordCache = updated;
        } catch (error) {
            console.error(`[PocketBase] Failed to sync ${field}:`, error);
        }
    },

    /**
     * Safely parse a JSON string with multiple fallback strategies.
     * @param {unknown} str
     * @param {string} fieldName
     * @param {unknown} fallback
     * @returns {unknown}
     */
    safeParseInternal(str, fieldName, fallback) {
        if (!str) return fallback;
        if (typeof str !== 'string') return str;
        try {
            return JSON.parse(str);
        } catch {
            try {
                // Recovery: escape unescaped internal quotes in string values
                const recovered = str.replace(/(:\s*")(.+?)("(?=\s*[,}\n\r]))/g, (match, p1, p2, p3) => {
                    const escapedContent = p2.replace(/(?<!\\)"/g, '\\"');
                    return p1 + escapedContent + p3;
                });
                return JSON.parse(recovered);
            } catch {
                try {
                    // Python repr fallback (True/False/None)
                    if (str.includes("'") || str.includes('True') || str.includes('False')) {
                        const jsFriendly = str
                            .replace(/\bTrue\b/g, 'true')
                            .replace(/\bFalse\b/g, 'false')
                            .replace(/\bNone\b/g, 'null');

                        if (
                            (jsFriendly.trim().startsWith('[') || jsFriendly.trim().startsWith('{')) &&
                            !jsFriendly.match(/function|=>|window|document|alert|eval/)
                        ) {
                            return new Function('return ' + jsFriendly)();
                        }
                    }
                } catch (innerError) {
                    console.log('[PocketBase] safeParseInternal fallback error:', innerError);
                }
                return fallback;
            }
        }
    },

    async syncLibraryItem(type, item, added) {
        const user = getCurrentUser();
        if (!user) return;

        const record = await this._getUserRecord(user.id);
        if (!record) return;

        let library = this.safeParseInternal(record.library, 'library', {});

        const pluralType = type === 'mix' ? 'mixes' : `${type}s`;
        const key = type === 'playlist' ? item.uuid : item.id;

        if (!library[pluralType]) library[pluralType] = {};

        if (added) {
            library[pluralType][key] = this._minifyItem(type, item);
        } else {
            delete library[pluralType][key];
        }

        await this._updateUserJSON(user.id, 'library', library);
    },

    /**
     * @param {string} type
     * @param {Record<string, unknown>} item
     * @returns {Record<string, unknown>}
     */
    _minifyItem(type, item) {
        if (!item) return item;

        const base = {
            id: item.id,
            addedAt: item.addedAt || Date.now(),
        };

        if (type === 'track') {
            return {
                ...base,
                title: item.title || null,
                duration: item.duration || null,
                explicit: item.explicit || false,
                artist: item.artist || (item.artists && item.artists.length > 0 ? item.artists[0] : null) || null,
                artists: item.artists?.map((a) => ({ id: a.id, name: a.name || null })) || [],
                album: item.album
                    ? {
                          id: item.album.id,
                          title: item.album.title || null,
                          cover: item.album.cover || null,
                          releaseDate: item.album.releaseDate || null,
                          vibrantColor: item.album.vibrantColor || null,
                          artist: item.album.artist || null,
                          numberOfTracks: item.album.numberOfTracks || null,
                      }
                    : null,
                copyright: item.copyright || null,
                isrc: item.isrc || null,
                trackNumber: item.trackNumber || null,
                streamStartDate: item.streamStartDate || null,
                version: item.version || null,
                mixes: item.mixes || null,
            };
        }

        if (type === 'album') {
            return {
                ...base,
                title: item.title || null,
                cover: item.cover || null,
                releaseDate: item.releaseDate || null,
                explicit: item.explicit || false,
                artist: item.artist
                    ? { name: item.artist.name || null, id: item.artist.id }
                    : item.artists?.[0]
                      ? { name: item.artists[0].name || null, id: item.artists[0].id }
                      : null,
                type: item.type || null,
                numberOfTracks: item.numberOfTracks || null,
            };
        }

        if (type === 'artist') {
            return {
                ...base,
                name: item.name || null,
                picture: item.picture || item.image || null,
            };
        }

        if (type === 'playlist') {
            return {
                uuid: item.uuid || item.id,
                addedAt: item.addedAt || Date.now(),
                title: item.title || item.name || null,
                image: item.image || item.squareImage || item.cover || null,
                numberOfTracks: item.numberOfTracks || (item.tracks ? item.tracks.length : 0),
                user: item.user ? { name: item.user.name || null } : null,
            };
        }

        if (type === 'mix') {
            return {
                id: item.id,
                addedAt: item.addedAt || Date.now(),
                title: item.title,
                subTitle: item.subTitle,
                mixType: item.mixType,
                cover: item.cover,
            };
        }

        return item;
    },

    async syncHistoryItem(historyEntry) {
        const user = getCurrentUser();
        if (!user) return;

        const record = await this._getUserRecord(user.id);
        if (!record) return;

        let history = this.safeParseInternal(record.history, 'history', []);
        const newHistory = [historyEntry, ...history].slice(0, 100);
        await this._updateUserJSON(user.id, 'history', newHistory);
    },

    async syncUserPlaylist(playlist, action) {
        const user = getCurrentUser();
        if (!user) return;

        const record = await this._getUserRecord(user.id);
        if (!record) return;

        let userPlaylists = this.safeParseInternal(record.user_playlists, 'user_playlists', {});

        if (action === 'delete') {
            delete userPlaylists[playlist.id];
            await this.unpublishPlaylist(playlist.id);
        } else {
            userPlaylists[playlist.id] = {
                id: playlist.id,
                name: playlist.name,
                cover: playlist.cover || null,
                tracks: playlist.tracks ? playlist.tracks.map((t) => this._minifyItem('track', t)) : [],
                createdAt: playlist.createdAt || Date.now(),
                updatedAt: playlist.updatedAt || Date.now(),
                numberOfTracks: playlist.tracks ? playlist.tracks.length : 0,
                images: playlist.images || [],
                isPublic: playlist.isPublic || false,
            };

            if (playlist.isPublic) {
                await this.publishPlaylist(playlist);
            }
        }

        await this._updateUserJSON(user.id, 'user_playlists', userPlaylists);
    },

    async syncUserFolder(folder, action) {
        const user = getCurrentUser();
        if (!user) return;

        const record = await this._getUserRecord(user.id);
        if (!record) return;

        let userFolders = this.safeParseInternal(record.user_folders, 'user_folders', {});

        if (action === 'delete') {
            delete userFolders[folder.id];
        } else {
            userFolders[folder.id] = {
                id: folder.id,
                name: folder.name,
                cover: folder.cover || null,
                playlists: folder.playlists || [],
                createdAt: folder.createdAt || Date.now(),
                updatedAt: folder.updatedAt || Date.now(),
            };
        }

        await this._updateUserJSON(user.id, 'user_folders', userFolders);
    },

    async getPublicPlaylist(uuid) {
        try {
            const record = await this.pb.collection(PUBLIC_COLLECTION).getFirstListItem(`uuid="${uuid}"`);

            let rawCover = record.image || record.cover || record.playlist_cover || '';
            let extraData = this.safeParseInternal(record.data, 'data', {});

            if (!rawCover && extraData && typeof extraData === 'object') {
                rawCover = extraData.cover || extraData.image || '';
            }

            let finalCover = rawCover;
            if (rawCover && !rawCover.startsWith('http') && !rawCover.startsWith('data:')) {
                finalCover = this.pb.files.getUrl(record, rawCover);
            }

            let images = [];
            let tracks = this.safeParseInternal(record.tracks, 'tracks', []);

            if (!finalCover && tracks && tracks.length > 0) {
                const uniqueCovers = [];
                const seenCovers = new Set();
                for (const track of tracks) {
                    const c = track.album?.cover;
                    if (c && !seenCovers.has(c)) {
                        seenCovers.add(c);
                        uniqueCovers.push(c);
                        if (uniqueCovers.length >= 4) break;
                    }
                }
                images = uniqueCovers;
            }

            let finalTitle = record.title || record.name || record.playlist_name;
            if (!finalTitle && extraData && typeof extraData === 'object') {
                finalTitle = extraData.title || extraData.name;
            }
            if (!finalTitle) finalTitle = 'Untitled Playlist';

            let finalDescription = record.description || '';
            if (!finalDescription && extraData && typeof extraData === 'object') {
                finalDescription = extraData.description || '';
            }

            return {
                ...record,
                id: record.uuid,
                name: finalTitle,
                title: finalTitle,
                description: finalDescription,
                cover: finalCover,
                image: finalCover,
                tracks: tracks,
                images: images,
                numberOfTracks: tracks.length,
                type: 'user-playlist',
                isPublic: true,
                user: { name: 'Community Playlist' },
            };
        } catch (error) {
            if (error.status === 404) return null;
            console.error('[PocketBase] Failed to fetch public playlist:', error);
            throw error;
        }
    },

    async publishPlaylist(playlist) {
        if (!playlist || !playlist.id) return;
        const user = getCurrentUser();
        if (!user) return;

        const data = {
            uuid: playlist.id,
            pb_user_id: user.id,
            title: playlist.name,
            name: playlist.name,
            playlist_name: playlist.name,
            image: playlist.cover,
            cover: playlist.cover,
            playlist_cover: playlist.cover,
            description: playlist.description || '',
            tracks: JSON.stringify(playlist.tracks || []),
            isPublic: true,
            data: {
                title: playlist.name,
                cover: playlist.cover,
                description: playlist.description || '',
            },
        };

        try {
            const existing = await this.pb.collection(PUBLIC_COLLECTION).getList(1, 1, {
                filter: `uuid="${playlist.id}"`,
            });

            if (existing.items.length > 0) {
                await this.pb.collection(PUBLIC_COLLECTION).update(existing.items[0].id, data);
            } else {
                await this.pb.collection(PUBLIC_COLLECTION).create(data);
            }
        } catch (error) {
            console.error('[PocketBase] Failed to publish playlist:', error);
        }
    },

    async unpublishPlaylist(uuid) {
        const user = getCurrentUser();
        if (!user) return;

        try {
            const existing = await this.pb.collection(PUBLIC_COLLECTION).getList(1, 1, {
                filter: `uuid="${uuid}"`,
            });

            if (existing.items && existing.items.length > 0) {
                await this.pb.collection(PUBLIC_COLLECTION).delete(existing.items[0].id);
            }
        } catch (error) {
            console.error('[PocketBase] Failed to unpublish playlist:', error);
        }
    },

    async clearCloudData() {
        const user = getCurrentUser();
        if (!user) return;

        try {
            const record = await this._getUserRecord(user.id);
            if (record) {
                await this.pb.collection('DB_users').delete(record.id);
                this._userRecordCache = null;
                alert('Cloud data cleared successfully.');
            }
        } catch (error) {
            console.error('[PocketBase] Failed to clear cloud data:', error);
            alert('Failed to clear cloud data. Check console for details.');
        }
    },

    /**
     * Called when PocketBase auth state changes (user signs in or out).
     * Merges local IndexedDB data with cloud data on sign-in.
     * @param {string} token
     * @param {import('pocketbase').RecordModel | null} user
     */
    async onAuthStateChanged(token, user) {
        if (user) {
            if (this._isSyncing) return;
            this._isSyncing = true;

            try {
                const cloudData = await this.getUserData();

                if (cloudData) {
                    let database = db;
                    if (typeof database === 'function') {
                        database = await database();
                    } else {
                        database = await database;
                    }

                    const getAll = async (store) => {
                        if (database && typeof database.getAll === 'function') return database.getAll(store);
                        if (database && database.db && typeof database.db.getAll === 'function')
                            return database.db.getAll(store);
                        return [];
                    };

                    const localData = {
                        tracks: (await getAll('favorites_tracks')) || [],
                        albums: (await getAll('favorites_albums')) || [],
                        artists: (await getAll('favorites_artists')) || [],
                        playlists: (await getAll('favorites_playlists')) || [],
                        mixes: (await getAll('favorites_mixes')) || [],
                        history: (await getAll('history_tracks')) || [],
                        userPlaylists: (await getAll('user_playlists')) || [],
                        userFolders: (await getAll('user_folders')) || [],
                    };

                    let { library, history, userPlaylists, userFolders } = cloudData;
                    let needsUpdate = false;

                    if (!library) library = {};
                    if (!library.tracks) library.tracks = {};
                    if (!library.albums) library.albums = {};
                    if (!library.artists) library.artists = {};
                    if (!library.playlists) library.playlists = {};
                    if (!library.mixes) library.mixes = {};
                    if (!userPlaylists) userPlaylists = {};
                    if (!userFolders) userFolders = {};
                    if (!history) history = [];

                    const mergeItem = (collection, item, type) => {
                        const id = type === 'playlist' ? item.uuid || item.id : item.id;
                        if (!collection[id]) {
                            collection[id] = this._minifyItem(type, item);
                            needsUpdate = true;
                        }
                    };

                    localData.tracks.forEach((item) => mergeItem(library.tracks, item, 'track'));
                    localData.albums.forEach((item) => mergeItem(library.albums, item, 'album'));
                    localData.artists.forEach((item) => mergeItem(library.artists, item, 'artist'));
                    localData.playlists.forEach((item) => mergeItem(library.playlists, item, 'playlist'));
                    localData.mixes.forEach((item) => mergeItem(library.mixes, item, 'mix'));

                    localData.userPlaylists.forEach((playlist) => {
                        if (!userPlaylists[playlist.id]) {
                            userPlaylists[playlist.id] = {
                                id: playlist.id,
                                name: playlist.name,
                                cover: playlist.cover || null,
                                tracks: playlist.tracks ? playlist.tracks.map((t) => this._minifyItem('track', t)) : [],
                                createdAt: playlist.createdAt || Date.now(),
                                updatedAt: playlist.updatedAt || Date.now(),
                                numberOfTracks: playlist.tracks ? playlist.tracks.length : 0,
                                images: playlist.images || [],
                                isPublic: playlist.isPublic || false,
                            };
                            needsUpdate = true;
                        }
                    });

                    localData.userFolders.forEach((folder) => {
                        if (!userFolders[folder.id]) {
                            userFolders[folder.id] = {
                                id: folder.id,
                                name: folder.name,
                                cover: folder.cover || null,
                                playlists: folder.playlists || [],
                                createdAt: folder.createdAt || Date.now(),
                                updatedAt: folder.updatedAt || Date.now(),
                            };
                            needsUpdate = true;
                        }
                    });

                    if (history.length === 0 && localData.history.length > 0) {
                        history = localData.history;
                        needsUpdate = true;
                    }

                    if (needsUpdate) {
                        await this._updateUserJSON(user.id, 'library', library);
                        await this._updateUserJSON(user.id, 'user_playlists', userPlaylists);
                        await this._updateUserJSON(user.id, 'user_folders', userFolders);
                        await this._updateUserJSON(user.id, 'history', history);
                    }

                    const convertedData = {
                        favorites_tracks: Object.values(library.tracks).filter((t) => t && typeof t === 'object'),
                        favorites_albums: Object.values(library.albums).filter((a) => a && typeof a === 'object'),
                        favorites_artists: Object.values(library.artists).filter((a) => a && typeof a === 'object'),
                        favorites_playlists: Object.values(library.playlists).filter((p) => p && typeof p === 'object'),
                        favorites_mixes: Object.values(library.mixes).filter((m) => m && typeof m === 'object'),
                        history_tracks: history,
                        user_playlists: Object.values(userPlaylists).filter((p) => p && typeof p === 'object'),
                        user_folders: Object.values(userFolders).filter((f) => f && typeof f === 'object'),
                    };

                    await database.importData(convertedData);
                    await new Promise((resolve) => setTimeout(resolve, 300));

                    window.dispatchEvent(new CustomEvent('library-changed'));
                    window.dispatchEvent(new CustomEvent('history-changed'));
                    window.dispatchEvent(new HashChangeEvent('hashchange'));

                    console.log('[PocketBase] ✓ Sync completed');
                }
            } catch (error) {
                console.error('[PocketBase] Sync error:', error);
            } finally {
                this._isSyncing = false;
            }
        } else {
            this._userRecordCache = null;
            this._isSyncing = false;
        }
    },
};

// Subscribe to PocketBase auth state changes for syncing
pb.authStore.onChange(syncManager.onAuthStateChanged.bind(syncManager), true);

export { pb, syncManager };
