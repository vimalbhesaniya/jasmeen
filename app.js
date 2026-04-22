const STORAGE_KEYS = {
  USERS: "users",
  SUBSCRIPTIONS: "subscriptionsByUser",
  SESSION: "activeSession",
};

const DEFAULT_SONGS = [
  { id: 1, title: "Love Story", year: 2008, artist: "Taylor Swift", album: "Fearless", image: "https://picsum.photos/seed/lovestory/120/80" },
  { id: 2, title: "You Belong With Me", year: 2008, artist: "Taylor Swift", album: "Fearless", image: "https://picsum.photos/seed/youbelong/120/80" },
  { id: 3, title: "Margaritaville", year: 1977, artist: "Jimmy Buffett", album: "Changes in Latitudes", image: "https://picsum.photos/seed/margarita/120/80" },
  { id: 4, title: "Come Monday", year: 1974, artist: "Jimmy Buffett", album: "Living and Dying in 3/4 Time", image: "https://picsum.photos/seed/comemonday/120/80" },
  { id: 5, title: "Viva La Vida", year: 2008, artist: "Coldplay", album: "Viva La Vida", image: "https://picsum.photos/seed/viva/120/80" },
  { id: 6, title: "Yellow", year: 2000, artist: "Coldplay", album: "Parachutes", image: "https://picsum.photos/seed/yellow/120/80" },
];
const DATA_FILE_PATH = "music-data.json";
let SONGS = [...DEFAULT_SONGS];
let DUMMY_SUBSCRIPTIONS_BY_EMAIL = {};

const loginView = document.getElementById("loginView");
const registerView = document.getElementById("registerView");
const mainView = document.getElementById("mainView");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const queryForm = document.getElementById("queryForm");

const loginMessage = document.getElementById("loginMessage");
const registerMessage = document.getElementById("registerMessage");
const queryMessage = document.getElementById("queryMessage");
const welcomeText = document.getElementById("welcomeText");
const userNameText = document.getElementById("userNameText");

const subscriptionList = document.getElementById("subscriptionList");
const subscriptionEmpty = document.getElementById("subscriptionEmpty");
const queryResults = document.getElementById("queryResults");
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[A-Za-z0-9_ ]{3,25}$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/;

document.getElementById("goRegister").addEventListener("click", (e) => {
  e.preventDefault();
  showView("register");
});

document.getElementById("goLogin").addEventListener("click", (e) => {
  e.preventDefault();
  showView("login");
});

document.getElementById("logoutLink").addEventListener("click", (e) => {
  e.preventDefault();
  logout();
});

loginForm.addEventListener("submit", handleLogin);
registerForm.addEventListener("submit", handleRegister);
queryForm.addEventListener("submit", handleQuery);

init();

async function init() {
  await loadAppData();
  const session = getSession();
  if (session?.email) {
    showView("main");
    renderMain(session.email);
    return;
  }
  showView("login");
}

async function loadAppData() {
  try {
    const response = await fetch(DATA_FILE_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error("Data file not available");
    const parsed = await response.json();

    if (Array.isArray(parsed.songs) && parsed.songs.length) {
      SONGS = parsed.songs;
    }
    if (parsed.dummySubscriptionsByEmail && typeof parsed.dummySubscriptionsByEmail === "object") {
      DUMMY_SUBSCRIPTIONS_BY_EMAIL = parsed.dummySubscriptionsByEmail;
    }
  } catch (err) {
    // Fallback keeps the app functional if JSON fetch is blocked.
    SONGS = [...DEFAULT_SONGS];
    DUMMY_SUBSCRIPTIONS_BY_EMAIL = {};
  }
}

function showView(name) {
  loginView.classList.add("hidden");
  registerView.classList.add("hidden");
  mainView.classList.add("hidden");
  if (name === "login") loginView.classList.remove("hidden");
  if (name === "register") registerView.classList.remove("hidden");
  if (name === "main") mainView.classList.remove("hidden");
}

function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
}

function setUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function getSubscriptionsMap() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS) || "{}");
}

function setSubscriptionsMap(map) {
  localStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(map));
}

function setSession(email) {
  const session = { email, loggedInAt: Date.now(), lastActionAt: Date.now() };
  sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

function getSession() {
  return JSON.parse(sessionStorage.getItem(STORAGE_KEYS.SESSION) || "null");
}

function updateSessionActivity() {
  const session = getSession();
  if (!session) return;
  session.lastActionAt = Date.now();
  sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

function clearSession() {
  sessionStorage.removeItem(STORAGE_KEYS.SESSION);
}

function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  const key = `${name}=`;
  const parts = document.cookie.split(";").map((c) => c.trim());
  const hit = parts.find((p) => p.startsWith(key));
  return hit ? decodeURIComponent(hit.slice(key.length)) : "";
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

function handleRegister(e) {
  e.preventDefault();
  registerMessage.textContent = "";
  registerMessage.style.color = "#b91c1c";
  const email = document.getElementById("registerEmail").value.trim().toLowerCase();
  const username = document.getElementById("registerUsername").value.trim();
  const password = document.getElementById("registerPassword").value;

  if (!EMAIL_REGEX.test(email)) {
    registerMessage.textContent = "Please enter a valid email address.";
    return;
  }
  if (!USERNAME_REGEX.test(username)) {
    registerMessage.textContent = "Username must be 3-25 chars (letters, numbers, space, underscore).";
    return;
  }
  if (!PASSWORD_REGEX.test(password)) {
    registerMessage.textContent = "Password must be 8-64 chars and include at least one letter and one number.";
    return;
  }

  const users = getUsers();
  const exists = users.find((u) => u.email === email);

  if (exists) {
    registerMessage.textContent = "The email already exists.";
    return;
  }

  users.push({ email, username, password });
  setUsers(users);
  registerForm.reset();
  registerMessage.style.color = "#065f46";
  registerMessage.textContent = "Registration successful. Please login.";
  showView("login");
}

function handleLogin(e) {
  e.preventDefault();
  loginMessage.textContent = "";
  loginMessage.style.color = "#b91c1c";
  const email = document.getElementById("loginEmail").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;

  if (!EMAIL_REGEX.test(email)) {
    loginMessage.textContent = "Please enter a valid email address.";
    return;
  }
  if (!PASSWORD_REGEX.test(password)) {
    loginMessage.textContent = "Please enter a valid password format.";
    return;
  }

  const users = getUsers();
  const valid = users.find((u) => u.email === email && u.password === password);

  if (!valid) {
    loginMessage.textContent = "email or password is invalid";
    return;
  }

  setSession(email);
  setCookie("lastLoginEmail", email);
  setCookie("lastLoginAt", new Date().toLocaleString());
  showView("main");
  renderMain(email);
  loginForm.reset();
}

function handleQuery(e) {
  e.preventDefault();
  queryMessage.textContent = "";
  queryMessage.style.color = "#b91c1c";
  queryResults.innerHTML = "";

  const title = document.getElementById("queryTitle").value.trim().toLowerCase();
  const yearRaw = document.getElementById("queryYear").value.trim();
  const artist = document.getElementById("queryArtist").value.trim().toLowerCase();
  const album = document.getElementById("queryAlbum").value.trim().toLowerCase();

  if (!title && !yearRaw && !artist && !album) {
    queryMessage.textContent = "At least one query field must be completed.";
    return;
  }
  if (yearRaw) {
    const numericYear = Number(yearRaw);
    const currentYear = new Date().getFullYear() + 3;
    if (!Number.isInteger(numericYear) || numericYear < 1900 || numericYear > currentYear) {
      queryMessage.textContent = `Year must be between 1900 and ${currentYear}.`;
      return;
    }
  }

  const year = yearRaw ? Number(yearRaw) : null;
  const results = SONGS.filter((song) => {
    return (
      (!title || song.title.toLowerCase().includes(title)) &&
      (!year || song.year === year) &&
      (!artist || song.artist.toLowerCase().includes(artist)) &&
      (!album || song.album.toLowerCase().includes(album))
    );
  });

  if (!results.length) {
    queryMessage.textContent = "No result is retrieved. Please query again.";
    return;
  }

  const session = getSession();
  const email = session?.email;
  updateSessionActivity();

  results.forEach((song) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="row">
        <div>
          <strong>${song.title}</strong> (${song.year}) - ${song.artist}<br>
          <span class="small">${song.album}</span>
        </div>
        <img src="${song.image}" alt="${song.artist}" width="90" height="60">
      </div>
    `;
    const btn = document.createElement("button");
    btn.textContent = "Subscribe";
    btn.addEventListener("click", () => subscribeSong(email, song));
    li.appendChild(btn);
    queryResults.appendChild(li);
  });
}

function subscribeSong(email, song) {
  if (!email) return;
  const map = getSubscriptionsMap();
  if (!map[email]) map[email] = [];
  const exists = map[email].some((s) => s.id === song.id);
  if (!exists) {
    map[email].push(song);
    setSubscriptionsMap(map);
  }
  updateSessionActivity();
  renderSubscriptions(email);
}

function removeSubscription(email, songId) {
  const map = getSubscriptionsMap();
  if (!map[email]) return;
  map[email] = map[email].filter((s) => s.id !== songId);
  setSubscriptionsMap(map);
  updateSessionActivity();
  renderSubscriptions(email);
}

function logout() {
  clearSession();
  showView("login");
  loginMessage.style.color = "#065f46";
  loginMessage.textContent = "Logged out successfully.";
}

function renderMain(email) {
  const users = getUsers();
  const user = users.find((u) => u.email === email);
  welcomeText.textContent = "Main areas: User, Subscription, Query";
  userNameText.textContent = user?.username || "-";

  seedDummySubscriptionsIfConfigured(email);
  renderSubscriptions(email);
}

function seedDummySubscriptionsIfConfigured(email) {
  if (!email) return;
  const seedSongs = DUMMY_SUBSCRIPTIONS_BY_EMAIL[email];
  if (!Array.isArray(seedSongs) || !seedSongs.length) return;

  const map = getSubscriptionsMap();
  if (Array.isArray(map[email]) && map[email].length) return;

  map[email] = seedSongs;
  setSubscriptionsMap(map);
}

function renderSubscriptions(email) {
  const map = getSubscriptionsMap();
  const list = map[email] || [];
  subscriptionList.innerHTML = "";
  subscriptionEmpty.style.display = list.length ? "none" : "block";

  list.forEach((song) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="row">
        <div>
          <strong>${song.title}</strong> (${song.year}) - ${song.artist}<br>
          <span class="small">${song.album}</span>
        </div>
        <img src="${song.image}" alt="${song.artist}" width="90" height="60">
      </div>
    `;
    const removeBtn = document.createElement("button");
    removeBtn.className = "danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeSubscription(email, song.id));
    li.appendChild(removeBtn);
    subscriptionList.appendChild(li);
  });
}
