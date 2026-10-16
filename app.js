const STORAGE_KEY = 'mijote-cookbook-v1';

const starterRecipes = [
  {
    id: 'pates-citron', title: 'Pâtes crémeuses au citron', category: 'Plats', description: 'Une sauce vive et soyeuse, prête avant que les pâtes ne refroidissent.', servings: 2, time: 20, art: 'art-pasta', favorite: true,
    body: "Faire cuire @spaghetti{200%g} dans une grande casserole d'eau salée.\nPendant ce temps, faire fondre @beurre{30%g} avec le zeste de @citron{1}.\nAjouter @crème fraîche{100%ml} et @parmesan{40%g}, puis #timer{3%minutes} à feu doux.\nMélanger avec les pâtes, un peu d'eau de cuisson et du @poivre{1%pincée}. Servir avec du @parmesan{20%g}."
  },
  {
    id: 'soupe-tomate', title: 'Soupe de tomates rôties', category: 'Entrées', description: 'Tomates confites au four, basilic frais et mie de pain croustillante.', servings: 4, time: 45, art: 'art-soup', favorite: false,
    body: "Préchauffer le four à 210°C. Couper @tomates{800%g} et @oignon rouge{1} en quartiers.\nArroser d'@huile d'olive{2%càs}, saler, poivrer et enfourner #timer{30%minutes}.\nMixer avec @bouillon de légumes{300%ml} et @basilic{1%poignée}.\nRéchauffer #timer{5%minutes} et servir avec @pain de campagne{4%tranches}."
  },
  {
    id: 'granola', title: 'Granola aux noisettes', category: 'Petit-déjeuner', description: 'De grosses pépites dorées pour les matins qui prennent leur temps.', servings: 8, time: 35, art: 'art-bake', favorite: false,
    body: "Préchauffer le four à 160°C. Mélanger @flocons d'avoine{300%g}, @noisettes{100%g} et @graines de courge{50%g}.\nChauffer @miel{80%ml} avec @huile de coco{40%ml} et @cannelle{1%càc}.\nVerser sur les ingrédients secs et bien mélanger. Étaler sur une plaque.\nCuire #timer{25%minutes} en remuant à mi-cuisson, puis laisser refroidir avant d'ajouter @raisins secs{60%g}."
  },
  {
    id: 'salade-lentilles', title: 'Salade tiède de lentilles', category: 'Plats', description: 'Lentilles vertes, vinaigrette moutardée et herbes du jardin.', servings: 3, time: 30, art: 'art-salad', favorite: false,
    body: "Rincer @lentilles vertes{200%g} et cuire dans @eau{600%ml} avec @laurier{1%feuille} #timer{20%minutes}.\nÉmincer @échalote{1} et ciseler @persil{1%bouquet}.\nFouetter @moutarde{1%càc}, @vinaigre de cidre{1%càs} et @huile de noix{3%càs}.\nÉgoutter les lentilles, mélanger encore tièdes avec la vinaigrette et @noix{40%g}."
  },
  {
    id: 'gateau-pommes', title: 'Gâteau moelleux aux pommes', category: 'Desserts', description: 'Un gâteau simple, parfumé à la vanille et un peu caramélisé.', servings: 6, time: 50, art: 'art-cake', favorite: true,
    body: "Préchauffer le four à 180°C. Fouetter @oeufs{2} et @sucre{100%g}.\nIncorporer @beurre fondu{90%g}, @farine{150%g}, @levure{1%sachet} et @lait{80%ml}.\nPeler et couper @pommes{3}, puis les incorporer à la pâte.\nVerser dans un moule beurré et cuire #timer{35%minutes}."
  }
];

const categoryColors = { Plats: '#7f9f62', 'Petit-déjeuner': '#d1a64d', Desserts: '#d38c81', Entrées: '#85aaa0', Boissons: '#8299bd' };
let state = loadState();
let activeView = 'recipes';
let activeCategory = '';
let selectedRecipeId = null;
let servingsOverride = null;
let installPrompt = null;
let toastTimeout;

const content = document.querySelector('#content');
const searchInput = document.querySelector('#search-input');
const dialog = document.querySelector('#recipe-dialog');
const recipeForm = document.querySelector('#recipe-form');

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.recipes)) return { recipes: saved.recipes, shopping: Array.isArray(saved.shopping) ? saved.shopping : [] };
  } catch (error) { console.warn('Carnet local illisible, chargement des recettes de départ.', error); }
  return { recipes: starterRecipes.map(recipe => ({ ...recipe })), shopping: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateCounts();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function updateCounts() {
  document.querySelector('#recipe-count').textContent = state.recipes.length;
  document.querySelector('#shopping-count').textContent = state.shopping.filter(item => !item.checked).length;
}

function categoryList() {
  return [...new Set(state.recipes.map(recipe => recipe.category || 'Plats'))].sort((a, b) => a.localeCompare(b, 'fr'));
}

function renderCategories() {
  const nav = document.querySelector('#category-nav');
  nav.innerHTML = categoryList().map(category => `<button class="category-item" data-category="${escapeHtml(category)}"><span class="category-dot" style="--category-color:${categoryColors[category] || '#a1b48a'}"></span>${escapeHtml(category)}</button>`).join('');
}

function getRecipeArt(recipe) {
  const known = ['art-pasta', 'art-soup', 'art-bake', 'art-salad', 'art-cake'];
  if (recipe.art && known.includes(recipe.art)) return recipe.art;
  const categoryArt = { Desserts: 'art-cake', Entrées: 'art-soup', 'Petit-déjeuner': 'art-bake' };
  return categoryArt[recipe.category] || 'art-herbs';
}

function recipeMinutes(recipe) {
  const timers = [...recipe.body.matchAll(/#timer\{([^}%]+)%?(minutes?|mins?|heures?|hours?)?\}/gi)];
  const total = timers.reduce((sum, match) => sum + Number.parseFloat(match[1].replace(',', '.')) * (/heure|hour/i.test(match[2] || '') ? 60 : 1), 0);
  return total || Number(recipe.time) || 25;
}

function cardMarkup(recipe, index) {
  const art = getRecipeArt(recipe);
  return `<article class="recipe-card" style="animation-delay:${Math.min(index, 8) * 35}ms">
    <button class="favorite-button ${recipe.favorite ? 'is-favorite' : ''}" data-favorite="${escapeHtml(recipe.id)}" aria-label="${recipe.favorite ? 'Retirer des' : 'Ajouter aux'} favorites">${recipe.favorite ? '♥' : '♡'}</button>
    <button class="recipe-open" data-open="${escapeHtml(recipe.id)}" aria-label="Ouvrir ${escapeHtml(recipe.title)}">
      <div class="recipe-art ${art}"><span class="art-symbol" aria-hidden="true">✳</span></div>
      <div class="recipe-card-body"><div class="recipe-meta-top"><span class="tag">${escapeHtml(recipe.category || 'Plats')}</span><span class="recipe-time">◷ ${recipeMinutes(recipe)} min</span></div>
      <h3>${escapeHtml(recipe.title)}</h3><p>${escapeHtml(recipe.description || 'Une recette à garder sous la main.')}</p>
      <div class="card-footer"><span>${Number(recipe.servings) || 2} portions</span><span>Cooklang</span></div></div>
    </button>
  </article>`;
}

function pageHeading(title, subtitle, button = true) {
  return `<div class="welcome-row"><div><p class="eyebrow">LE PLAISIR DU FAIT MAISON</p><h1>${title}</h1><p class="welcome-copy">${subtitle}</p></div>${button ? '<button class="primary-button" id="new-recipe"><span class="plus">+</span> Nouvelle recette</button>' : ''}</div>`;
}

function renderRecipes() {
  const query = searchInput.value.trim().toLocaleLowerCase('fr');
  let recipes = [...state.recipes];
  if (activeView === 'favorites') recipes = recipes.filter(recipe => recipe.favorite);
  if (activeCategory) recipes = recipes.filter(recipe => recipe.category === activeCategory);
  if (query) recipes = recipes.filter(recipe => `${recipe.title} ${recipe.description} ${recipe.category} ${recipe.body}`.toLocaleLowerCase('fr').includes(query));
  recipes.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  const title = activeView === 'favorites' ? 'Mes favorites' : activeCategory || 'Votre carnet de cuisine';
  const subtitle = activeCategory ? `Vos recettes dans ${activeCategory.toLocaleLowerCase('fr')}.` : 'Les recettes qui donnent envie de passer à table.';
  const average = state.recipes.length ? Math.round(state.recipes.reduce((sum, recipe) => sum + recipeMinutes(recipe), 0) / state.recipes.length) : 0;
  content.innerHTML = `${pageHeading(title, subtitle)}<div class="stats-strip"><span class="stat"><strong>${state.recipes.length}</strong> recettes</span><span class="stat"><strong>${categoryList().length}</strong> catégories</span><span class="stat"><strong>${average} min</strong> en moyenne</span><span class="stat"><strong>${state.recipes.filter(recipe => recipe.favorite).length}</strong> coups de cœur</span></div><div class="section-heading"><h2>${query ? 'Résultats' : activeView === 'favorites' ? 'À refaire bientôt' : 'À cuisiner bientôt'}</h2><select class="sort-select" id="sort-select" aria-label="Trier les recettes"><option value="az">Trier : A à Z</option><option value="quick">Les plus rapides</option><option value="recent">Les plus récentes</option></select></div><div class="recipe-grid">${recipes.map(cardMarkup).join('')}</div>${recipes.length ? '' : `<div class="empty-state"><h2>${query ? 'Aucune recette trouvée' : 'Votre carnet attend sa première recette'}</h2><p>${query ? 'Essayez un autre ingrédient ou un autre nom.' : 'Ajoutez une recette ou importez vos fichiers Cooklang.'}</p><button class="primary-button" id="new-recipe"><span class="plus">+</span> Nouvelle recette</button></div>`}`;
  document.querySelector('#sort-select').addEventListener('change', event => {
    const sorted = [...recipes];
    if (event.target.value === 'quick') sorted.sort((a, b) => recipeMinutes(a) - recipeMinutes(b));
    else if (event.target.value === 'recent') sorted.reverse();
    else sorted.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    content.querySelector('.recipe-grid').innerHTML = sorted.map(cardMarkup).join('');
  });
  const newButton = document.querySelector('#new-recipe');
  if (newButton) newButton.addEventListener('click', openNewRecipe);
}

function parseIngredientTag(tag) {
  const match = tag.match(/^@(.+?)\{([^}]*)\}$/);
  if (!match) return null;
  const [quantity = '', unit = ''] = match[2].split('%');
  return { name: match[1].trim(), quantity: quantity.trim(), unit: unit.trim() };
}

function ingredientData(recipe) {
  const found = new Map();
  for (const match of recipe.body.matchAll(/@[^{}]+\{[^{}]*\}/g)) {
    const ingredient = parseIngredientTag(match[0]);
    if (!ingredient) continue;
    const key = `${ingredient.name.toLocaleLowerCase('fr')}|${ingredient.unit}`;
    if (found.has(key)) {
      const previous = found.get(key);
      previous.quantity = addQuantities(previous.quantity, ingredient.quantity);
    } else found.set(key, ingredient);
  }
  return [...found.values()];
}

function numericQuantity(value) {
  const trimmed = String(value).trim().replace(',', '.');
  if (/^\d+\s*\/\s*\d+$/.test(trimmed)) {
    const [numerator, denominator] = trimmed.split('/').map(Number);
    return denominator ? numerator / denominator : NaN;
  }
  return Number.parseFloat(trimmed);
}

function formatQuantity(value) {
  if (!Number.isFinite(value)) return '';
  if (Math.abs(value - Math.round(value)) < 0.001) return String(Math.round(value));
  return String(Number(value.toFixed(2))).replace('.', ',');
}

function addQuantities(first, second) {
  const a = numericQuantity(first), b = numericQuantity(second);
  return Number.isFinite(a) && Number.isFinite(b) ? formatQuantity(a + b) : [first, second].filter(Boolean).join(' + ');
}

function scaledQuantity(quantity, ratio) {
  const value = numericQuantity(quantity);
  if (!Number.isFinite(value) || !quantity) return quantity;
  return formatQuantity(value * ratio);
}

function detailIngredientMarkup(ingredient, ratio) {
  const amount = scaledQuantity(ingredient.quantity, ratio);
  return `<li><input type="checkbox" aria-label="${escapeHtml(ingredient.name)}"><span>${escapeHtml(ingredient.name)}</span><span class="ingredient-amount">${escapeHtml([amount, ingredient.unit].filter(Boolean).join(' '))}</span></li>`;
}

function renderCookText(body, ratio) {
  return body.split('\n').map(line => {
    const tags = /(@[^{}]+\{[^{}]*\}|~[^{}]+\{[^{}]*\}|#timer\{[^{}]*\})/gi;
    let html = '';
    let cursor = 0;
    for (const match of line.matchAll(tags)) {
      html += escapeHtml(line.slice(cursor, match.index));
      const tag = match[0];
      if (tag.startsWith('@')) {
        const ingredient = parseIngredientTag(tag);
        const amount = [scaledQuantity(ingredient.quantity, ratio), ingredient.unit].filter(Boolean).join(' ');
        html += `<span class="cook-ingredient">${escapeHtml(ingredient.name)}${amount ? ` <small>${escapeHtml(amount)}</small>` : ''}</span>`;
      } else if (tag.startsWith('~')) {
        html += `<span class="cook-tool">${escapeHtml(tag.slice(1, tag.indexOf('{')).trim())}</span>`;
      } else {
        const [, amount, unit = 'minutes'] = tag.match(/^#timer\{([^}%]+)%?(minutes?|mins?|heures?|hours?)?\}$/i) || [];
        html += `<button class="timer-button" data-timer="${escapeHtml(amount || '')}" data-unit="${escapeHtml(unit)}">⏱ ${escapeHtml(amount || '')} ${escapeHtml(unit)}</button>`;
      }
      cursor = match.index + tag.length;
    }
    html += escapeHtml(line.slice(cursor));
    return `<p class="cook-line">${html}</p>`;
  }).join('');
}

function renderDetail(recipe) {
  servingsOverride = servingsOverride || Number(recipe.servings) || 2;
  const ingredients = ingredientData(recipe);
  const ratio = servingsOverride / (Number(recipe.servings) || 2);
  content.innerHTML = `<div class="recipe-detail"><button class="back-button" id="back-to-recipes">← Retour aux recettes</button>
    <section class="detail-hero"><div class="detail-art ${getRecipeArt(recipe)}"></div><div class="detail-copy"><p class="eyebrow">${escapeHtml(recipe.category || 'Plats')} · COOKLANG</p><h1 class="detail-title">${escapeHtml(recipe.title)}</h1><p>${escapeHtml(recipe.description || 'Une recette à garder sous la main.')}</p><div class="detail-meta"><span>◷ ${recipeMinutes(recipe)} min</span><span>▤ ${ingredients.length} ingrédients</span></div><div class="detail-actions"><button class="primary-button" id="add-ingredients">Ajouter à ma liste</button><button class="secondary-button" id="edit-recipe">Modifier</button><button class="secondary-button" id="delete-recipe">Supprimer</button></div></div></section>
    <section class="detail-columns"><div><div class="section-heading"><h2>Ingrédients</h2></div><div class="serving-control"><span>Portions</span><div class="stepper"><button id="servings-down" aria-label="Une portion en moins">−</button><strong id="servings-value">${servingsOverride}</strong><button id="servings-up" aria-label="Une portion en plus">+</button></div></div><ul class="ingredient-list">${ingredients.map(ingredient => detailIngredientMarkup(ingredient, ratio)).join('')}</ul></div><div><h2>Préparation</h2><div class="cook-steps">${renderCookText(recipe.body, ratio)}</div></div></section></div>`;
  document.querySelector('#back-to-recipes').addEventListener('click', () => { selectedRecipeId = null; servingsOverride = null; render(); });
  document.querySelector('#servings-down').addEventListener('click', () => changeServings(-1));
  document.querySelector('#servings-up').addEventListener('click', () => changeServings(1));
  document.querySelector('#add-ingredients').addEventListener('click', () => addIngredients(recipe));
  document.querySelector('#edit-recipe').addEventListener('click', () => openEditRecipe(recipe));
  document.querySelector('#delete-recipe').addEventListener('click', () => deleteRecipe(recipe));
}

function changeServings(delta) {
  servingsOverride = Math.max(1, Math.min(24, servingsOverride + delta));
  const recipe = state.recipes.find(item => item.id === selectedRecipeId);
  if (recipe) renderDetail(recipe);
}

function renderShopping() {
  const active = state.shopping.filter(item => !item.checked).length;
  content.innerHTML = `<section class="shopping-view">${pageHeading('Liste de courses', 'Les ingrédients de vos prochaines recettes.', false)}<div class="shopping-topline"><div class="stats-strip" style="border-bottom:0;margin:0"><span class="stat"><strong>${active}</strong> à prendre</span><span class="stat"><strong>${state.shopping.length - active}</strong> dans le panier</span></div>${state.shopping.some(item => item.checked) ? '<button class="secondary-button" id="clear-checked">Effacer les articles cochés</button>' : ''}</div>${state.shopping.length ? `<ul class="shopping-list">${state.shopping.map((item, index) => `<li class="shopping-row ${item.checked ? 'is-checked' : ''}"><input type="checkbox" data-shopping-check="${index}" ${item.checked ? 'checked' : ''}><span class="shopping-name">${escapeHtml(item.name)}${item.amount ? ` <span class="ingredient-amount">${escapeHtml(item.amount)}</span>` : ''}</span><span class="shopping-source">${escapeHtml(item.recipe || '')}</span><button class="icon-button" data-shopping-remove="${index}" aria-label="Supprimer ${escapeHtml(item.name)}">×</button></li>`).join('')}</ul>` : `<div class="empty-state"><h2>Votre liste est vide</h2><p>Depuis une recette, ajoutez ses ingrédients ici.</p><button class="secondary-button" id="browse-recipes">Parcourir les recettes</button></div>`}</section>`;
  const browse = document.querySelector('#browse-recipes');
  if (browse) browse.addEventListener('click', () => setView('recipes'));
  const clear = document.querySelector('#clear-checked');
  if (clear) clear.addEventListener('click', () => { state.shopping = state.shopping.filter(item => !item.checked); saveState(); renderShopping(); });
}

function render() {
  updateCounts();
  renderCategories();
  document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('is-active', button.dataset.view === activeView && !activeCategory));
  if (selectedRecipeId) {
    const recipe = state.recipes.find(item => item.id === selectedRecipeId);
    if (recipe) return renderDetail(recipe);
    selectedRecipeId = null;
  }
  if (activeView === 'shopping') return renderShopping();
  renderRecipes();
}

function setView(view) {
  activeView = view;
  activeCategory = '';
  selectedRecipeId = null;
  render();
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

function addIngredients(recipe) {
  const ratio = (servingsOverride || Number(recipe.servings) || 2) / (Number(recipe.servings) || 2);
  const ingredients = ingredientData(recipe);
  for (const ingredient of ingredients) {
    const amount = [scaledQuantity(ingredient.quantity, ratio), ingredient.unit].filter(Boolean).join(' ');
    const existing = state.shopping.find(item => item.name.toLocaleLowerCase('fr') === ingredient.name.toLocaleLowerCase('fr') && item.recipe === recipe.title);
    if (existing) existing.amount = amount;
    else state.shopping.push({ name: ingredient.name, amount, recipe: recipe.title, checked: false });
  }
  saveState();
  showToast(`${ingredients.length} ingrédients ajoutés à la liste`);
}

function openNewRecipe() {
  recipeForm.reset();
  recipeForm.elements.servings.value = 2;
  recipeForm.dataset.editing = '';
  document.querySelector('#dialog-title').textContent = 'Nouvelle recette';
  recipeForm.querySelector('[type="submit"]').textContent = 'Enregistrer la recette';
  dialog.showModal();
}

function openEditRecipe(recipe) {
  recipeForm.elements.title.value = recipe.title;
  recipeForm.elements.category.value = recipe.category || 'Plats';
  recipeForm.elements.servings.value = recipe.servings || 2;
  recipeForm.elements.description.value = recipe.description || '';
  recipeForm.elements.body.value = recipe.body;
  recipeForm.dataset.editing = recipe.id;
  document.querySelector('#dialog-title').textContent = 'Modifier la recette';
  recipeForm.querySelector('[type="submit"]').textContent = 'Enregistrer les modifications';
  dialog.showModal();
}

recipeForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(recipeForm);
  const editingId = recipeForm.dataset.editing;
  const previous = state.recipes.find(recipe => recipe.id === editingId);
  const recipe = {
    id: editingId || `recipe-${crypto.randomUUID()}`,
    title: data.get('title').trim(), category: data.get('category'), servings: Number(data.get('servings')) || 2,
    description: data.get('description').trim(), body: data.get('body').trim(), favorite: previous?.favorite || false,
    art: previous?.art || '', time: previous?.time || 0
  };
  if (previous) state.recipes = state.recipes.map(item => item.id === editingId ? recipe : item);
  else state.recipes.unshift(recipe);
  saveState();
  dialog.close();
  selectedRecipeId = recipe.id;
  servingsOverride = recipe.servings;
  render();
  showToast(previous ? 'Recette mise à jour' : 'Recette ajoutée au carnet');
});

function deleteRecipe(recipe) {
  if (!window.confirm(`Supprimer « ${recipe.title} » de votre carnet ?`)) return;
  state.recipes = state.recipes.filter(item => item.id !== recipe.id);
  state.shopping = state.shopping.filter(item => item.recipe !== recipe.title);
  selectedRecipeId = null;
  servingsOverride = null;
  saveState();
  render();
  showToast('Recette supprimée');
}

function toggleFavorite(id) {
  state.recipes = state.recipes.map(recipe => recipe.id === id ? { ...recipe, favorite: !recipe.favorite } : recipe);
  saveState();
  render();
}

function toggleShopping(index, checked) {
  if (!state.shopping[index]) return;
  state.shopping[index].checked = checked;
  saveState();
  renderShopping();
}

function addImportedRecipe(title, body) {
  const cleanedTitle = title.replace(/\.cook$/i, '').replace(/[-_]/g, ' ').trim() || 'Recette importée';
  state.recipes.unshift({ id: `recipe-${crypto.randomUUID()}`, title: cleanedTitle, category: 'Plats', description: 'Importée depuis votre carnet Cooklang.', servings: 2, time: 0, favorite: false, art: '', body: body.trim() });
}

document.addEventListener('click', event => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) return setView(viewButton.dataset.view);
  const categoryButton = event.target.closest('[data-category]');
  if (categoryButton) { activeView = 'recipes'; activeCategory = categoryButton.dataset.category; selectedRecipeId = null; return render(); }
  const openButton = event.target.closest('[data-open]');
  if (openButton) { selectedRecipeId = openButton.dataset.open; servingsOverride = null; return render(); }
  const favoriteButton = event.target.closest('[data-favorite]');
  if (favoriteButton) return toggleFavorite(favoriteButton.dataset.favorite);
  const check = event.target.closest('[data-shopping-check]');
  if (check) return toggleShopping(Number(check.dataset.shoppingCheck), check.checked);
  const remove = event.target.closest('[data-shopping-remove]');
  if (remove) { state.shopping.splice(Number(remove.dataset.shoppingRemove), 1); saveState(); return renderShopping(); }
  const timer = event.target.closest('[data-timer]');
  if (timer) {
    const amount = Number.parseFloat(timer.dataset.timer);
    const minutes = /heure|hour/i.test(timer.dataset.unit) ? amount * 60 : amount;
    showToast(`Minuteur de ${timer.dataset.timer} ${timer.dataset.unit} lancé`);
    setTimeout(() => showToast(`Minuteur terminé pour ${selectedRecipeId ? state.recipes.find(item => item.id === selectedRecipeId)?.title || 'votre recette' : 'votre recette'}`), minutes * 60 * 1000);
  }
});

searchInput.addEventListener('input', () => {
  if (!selectedRecipeId && activeView !== 'shopping') renderRecipes();
});
searchInput.addEventListener('keydown', event => { if (event.key === 'Escape') { searchInput.value = ''; render(); } });
document.addEventListener('keydown', event => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); searchInput.focus(); }
});
document.querySelector('#new-recipe')?.addEventListener('click', openNewRecipe);
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

document.querySelector('#import-button').addEventListener('click', () => document.querySelector('#import-file').click());
document.querySelector('#import-file').addEventListener('change', async event => {
  const files = [...event.target.files];
  if (!files.length) return;
  try {
    for (const file of files) {
      const text = await file.text();
      if (file.name.endsWith('.json')) {
        const imported = JSON.parse(text);
        const recipes = Array.isArray(imported) ? imported : imported.recipes;
        if (Array.isArray(recipes)) state.recipes.push(...recipes.map(recipe => ({ ...recipe, id: `recipe-${crypto.randomUUID()}` })));
      } else addImportedRecipe(file.name, text);
    }
    saveState();
    render();
    showToast(`${files.length} fichier${files.length > 1 ? 's' : ''} importé${files.length > 1 ? 's' : ''}`);
  } catch (error) { showToast('Fichier non reconnu. Importez un .cook ou un export JSON.'); }
  event.target.value = '';
});

document.querySelector('#export-button').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mon-carnet-mijote.json';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Export téléchargé');
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  document.querySelector('#install-button').hidden = false;
});
document.querySelector('#install-button').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  document.querySelector('#install-button').hidden = true;
});

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js').catch(error => console.warn('Service worker indisponible', error)));
render();