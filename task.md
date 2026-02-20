# Tâches Globales du Projet

Ce fichier suit la progression globale des tâches pour le projet monochrome (MusicFlow).

## Objectifs Actuels : Renommage et Configuration URL Base

- [x] Renommer "Monochrome" en "MusicFlow" partout
- [x] Enlever "url_base" qui ne sert à rien
- [x] Configurer `URL_BASE_PUBLIC` dans le `docker-compose.yml`
- [x] Faire en sorte que le logo en haut à gauche utilise le `URL_BASE_PUBLIC` quand on clique dessus
- [x] Créer le plan d'implémentation

## Historique des Objectifs

- [x] Charger la persona de l'agent `bmad-master`
- [x] Charger la configuration depuis `_bmad/core/config.yaml`
- [x] Saluer l'utilisateur (Michael) en Français
- [x] Afficher le menu de l'agent
- [x] Exécuter le workflow "Party Mode"
  - [x] Analyse complète de l'application (Analyst)
  - [x] Création du PRD (Product Manager)
    - [x] Préparation du Docker Compose Complexe pour Unraid (Architect)
      - [x] Service Monochrome (Port configurable != 3000)
      - [x] Service PocketBase
      - [x] Service MinIO (S3)
      - [x] Service Redis
    - [x] Création du Workflow GitHub pour publier l'image Docker (DevOps)
