# Product Requirements Document (PRD) : Monochrome sur Unraid (Stack Complète)

## 1. Vue d'ensemble

Déploiement "Production-Ready" de Monochrome sur Unraid, incluant le stockage S3 (MinIO) et le cache (Redis) pour une performance et une scalabilité optimales.

## 2. User Stories (Mises à jour)

### Administrateur Système (Unraid)

- **En tant qu'** admin, **je veux** que le port par défaut ne soit PAS 3000 (conflit fréquent), **afin de** déployer sans erreur immédiate.
- **En tant qu'** admin, **je veux** disposer de MinIO pour stocker ma musique de manière compatible S3, **afin de** découpler le stockage de l'application.
- **En tant qu'** admin, **je veux** une instance Redis pour gérer les sessions et le cache, **afin d'** améliorer la réactivité.

## 3. Spécifications Techniques

### Architecture Micro-Services

1. **`monochrome`** : Frontend/App Server.
    - Port défaut : **3001** (ou configurable).
2. **`pocketbase`** : Backend API & Auth.
3. **`minio`** : Object Storage (S3).
    - Persistance : `/mnt/user/appdata/monochrome/minio`.
4. **`redis`** : Key-Value Store.
    - Persistance : `/mnt/user/appdata/monochrome/redis`.

### Volumes & Persistance

Tous les volumes doivent être mappés vers des chemins locaux Unraid (`./data/...` ou absolus) pour faciliter les backups.

### Configuration (`.env`)

- `MONOCHROME_PORT=3001`
- `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`
- `REDIS_HOST`, `REDIS_PORT`
