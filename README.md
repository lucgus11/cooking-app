# Mijote

Carnet de recettes Cooklang sous forme de PWA. Les recettes, favoris et listes de courses sont conservés dans le stockage local du navigateur ; l’interface et les recettes restent accessibles hors ligne après le premier chargement.

## Lancer en local

Depuis ce dossier, démarrez un serveur HTTP à la racine du projet, par exemple :

```sh
python3 -m http.server 4173
```

Ouvrez ensuite `http://localhost:4173`. Le service worker et l’installation PWA nécessitent `localhost` ou HTTPS, et non une ouverture directe du fichier HTML.

## Utilisation

- Rechercher par nom, catégorie ou ingrédient ; filtrer les favoris et catégories.
- Créer et modifier des recettes Cooklang, ajuster les portions et lancer les minuteurs.
- Ajouter les ingrédients à une liste de courses persistante.
- Importer des fichiers `.cook`, `.txt`, `.md` ou un export JSON ; exporter le carnet complet en JSON.

Les données restent sur cet appareil. Exportez régulièrement le carnet pour en conserver une copie.