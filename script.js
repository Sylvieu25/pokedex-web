const API_URL = "https://pokeapi.co/api/v2/pokemon";
const LIMIT = 20;

let offset = 0;
let total = 0;
let pokemonList = [];
let requestId = 0;
let messageTimer = null;

const grid = document.getElementById("grid");
const searchInput = document.getElementById("search");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const pageInfo = document.getElementById("page-info");

// Fetch one page of Pokémon: the list first, then each Pokémon's details
async function loadPage() {
  const currentRequest = ++requestId;

  statusEl.textContent = "Loading Pokémon...";
  grid.innerHTML = "";
  pokemonList = [];
  prevBtn.disabled = true;
  nextBtn.disabled = true;

  try {
    const response = await fetch(`${API_URL}?limit=${LIMIT}&offset=${offset}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    total = data.count;

    const results = await Promise.allSettled(
      data.results.map((p) =>
        fetch(p.url).then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
      )
    );

    // Ignore this result if the user already moved to another page
    if (currentRequest !== requestId) return;

    pokemonList = results
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    render();
  } catch (error) {
    if (currentRequest !== requestId) return;
    console.error(error);
    statusEl.textContent = "Could not load Pokémon. Please refresh and try again.";
  }

  updatePagination();
}

// Show cards, filtered by the search box (uses data already loaded)
function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = pokemonList.filter((p) => p.name.includes(query));

  grid.innerHTML = "";

  if (pokemonList.length === 0) return;

  if (filtered.length === 0) {
    statusEl.textContent = `No Pokémon on this page match "${searchInput.value.trim()}".`;
    return;
  }

  statusEl.textContent = "";
  filtered.forEach((pokemon) => grid.appendChild(createCard(pokemon)));
}

function createCard(pokemon) {
  const card = document.createElement("article");
  const mainType = pokemon.types[0].type.name;
  card.className = `card type-${mainType}`;

  const img = document.createElement("img");
  img.src =
    pokemon.sprites.other?.["official-artwork"]?.front_default ||
    pokemon.sprites.front_default ||
    "";
  img.alt = pokemon.name;
  img.loading = "lazy";

  const id = document.createElement("span");
  id.className = "card-id";
  id.textContent = `#${String(pokemon.id).padStart(3, "0")}`;

  const name = document.createElement("h2");
  name.className = "card-name";
  name.textContent = pokemon.name;

  const types = document.createElement("div");
  types.className = "types";
  pokemon.types.forEach((t) => {
    const badge = document.createElement("span");
    badge.className = `badge type-${t.type.name}`;
    badge.textContent = t.type.name;
    types.appendChild(badge);
  });

  // API gives height in decimetres and weight in hectograms
  const stats = document.createElement("p");
  stats.className = "stats";
  stats.textContent = `${pokemon.height / 10} m · ${pokemon.weight / 10} kg`;

  const button = document.createElement("button");
  button.className = "card-btn";
  button.type = "button";
  button.textContent = "Introduce";
  button.addEventListener("click", () => showMessage(pokemon));

  card.append(img, id, name, types, stats, button);
  return card;
}

// Button result: name + abilities (prefers regular abilities over hidden ones)
function showMessage(pokemon) {
  const regular = pokemon.abilities
    .filter((a) => !a.is_hidden)
    .map((a) => a.ability.name);
  const abilities = regular.length
    ? regular
    : pokemon.abilities.map((a) => a.ability.name);

  messageEl.textContent = `I am ${pokemon.name} and I have ${abilities.join(" and ")}.`;
  messageEl.hidden = false;

  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    messageEl.hidden = true;
  }, 4000);
}

function updatePagination() {
  const totalPages = Math.ceil(total / LIMIT);
  prevBtn.disabled = offset === 0;
  nextBtn.disabled = total === 0 || offset + LIMIT >= total;
  pageInfo.textContent = totalPages
    ? `Page ${offset / LIMIT + 1} of ${totalPages}`
    : "";
}

function goToPage(newOffset) {
  offset = newOffset;
  searchInput.value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
  loadPage();
}

searchInput.addEventListener("input", render);
prevBtn.addEventListener("click", () => goToPage(Math.max(0, offset - LIMIT)));
nextBtn.addEventListener("click", () => goToPage(offset + LIMIT));

loadPage();