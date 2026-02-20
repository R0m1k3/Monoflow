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
- [x] Retirer la section "Configuration Personnalisée" et le texte sur la confidentialité des données de la page Compte (pour instance locale).
- [x] Commit et Push des changements.
- [x] Fix GitHub Actions `lint.yml` invalid inputs and any remaining HTML linting issues.

## Objectifs Actuels : Nouvel ajout Thèmes Glossy

L'objectif est d'ajouter deux nouveaux thèmes "Glossy" (façon Apple TV avec Glassmorphism).

- Un thème **Glossy Light** (clair, translucide, givré).
- Un thème **Glossy Dark** (sombre, néon, reflets de verre).

- [x] Analyser le fonctionnement des thèmes actuels (CSS variables, attributs `data-theme`).
- [x] Créer les définitions de variables CSS pour le thème `glossy-light`.
- [x] Créer les définitions de variables CSS pour le thème `glossy-dark`.
- [x] Assurer la bonne intégration du `backdrop-filter: blur(...)` sur les éléments fixes pour ces thèmes précis.
- [x] Mettre à jour `<select id="theme-select">` dans `index.html` ou `settings.js`.
- [x] Tester et valider visuellement les deux thèmes.

## Objectifs Actuels : Résolution d'erreur Build CI

- [x] Analyser l'erreur de build sur GitHub Actions (`npx vite build` exit code 1).
- [x] Reproduire l'erreur de linting/build CSS localement.
- [x] Corriger l'erreur de syntaxe globale dans `styles.css` (accolade en trop et propriétés hors sélecteur).
- [x] Valider le succès de la commande de build localement (`npx vite build`).
- [x] Pousser la correction pour débloquer la CI.

## Objectifs Actuels : Ajustements Thèmes Glossy (Retours User)

- [x] Désactiver l'extraction de palette (couleurs dynamiques) pour les thèmes glossy (`ui.js`).
- [x] Forcer un accent/teinte "or" (`#d4af37`) global sur les deux variantes glossy.
- [x] Remplacer le fond d'écran (pochette floue) par un dégradé radial façon "Apple TV" pour `glossy-light` et `glossy-dark`.
- [x] Améliorer la lisibilité et l'opacité des cartes d'albums (`.card`) sur `glossy-light` (augmentation de l'opacité, ajout d'ombrage et de flou de fond).
- [x] Correction de la visibilité du fond dégradé (changement de `background-color` à `background`).

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
