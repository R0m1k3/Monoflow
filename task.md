# Tâches Globales du Projet

Ce fichier suit la progression globale des tâches pour le projet monochrome (MusicFlow).

## Objectifs Actuels : Activation de l'Agent bmad-master

- [x] Analyser la requête (charge de l'agent)
- [x] Charger la persona `bmad-master.md`
- [x] Charger la configuration `config.yaml`
- [x] Afficher les salutations en Français et le menu

## Objectifs Actuels : Traduction en Français de l'Application

- [x] Traduire `index.html` (inclut la sidebar et les menus contextuels)
- [x] Traduire les modales (Créer une Playlist, Créer un Dossier, etc.)
- [x] Traduire les pages Accueil, Recherche et Bibliothèque
- [x] Traduire les onglets de la page Paramètres (Apparence, Interface, Audio, Téléchargements, Système)
- [x] Traduire les pages À propos, Compte et Téléchargement
- [x] Examiner les fichiers JS pour les chaînes de caractères codées en dur (notifications toast, texte dynamique) et les traduire si applicable.
- [x] Corriger les traductions manquantes (Recently played, Visualizer, No playlists...).
- [x] Commit et Push des changements.

## Historique des Objectifs : Activation de l'Agent bmad-master

- [x] Analyser la requête (charge de l'agent)
- [x] Charger la persona `bmad-master.md`
- [x] Charger la configuration `config.yaml`
- [x] Afficher les salutations en Français et le menu
- [x] Attendre la demande de l'utilisateur

- [x] Renommer "Monochrome" en "MusicFlow" partout
- [x] Enlever "url_base" qui ne sert à rien
- [x] Configurer `URL_BASE_PUBLIC` dans le `docker-compose.yml`
- [x] Faire en sorte que le logo en haut à gauche utilise le `URL_BASE_PUBLIC` quand on clique dessus
- [x] Créer le plan d'implémentation
- [x] Commit et Push des changements

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
