// PianoPath: simple functions for folder scanning, rendering and lesson tracking.
let courseFolder = null;
let lessons = [];
let currentPage = "Repertoire";
let loopStart = null, loopEnd = null, loopEnabled = false;

const PRACTICE_KEY = "pianopath-practice-v4";
const DONE_KEY = "pianopath-done-v4";

function readList(key) { return JSON.parse(localStorage.getItem(key) || "[]"); }
function saveList(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function findLesson(path) { return lessons.find(lesson => lesson.path === path); }
function isDone(lesson) { return readList(DONE_KEY).includes(lesson.path); }
function inPractice(lesson) { return readList(PRACTICE_KEY).includes(lesson.path); }

async function openCourseFolder() {
  try {
    courseFolder = await window.showDirectoryPicker({ mode: "readwrite" });
    await scanLessons();
    renderPage();
  } catch (error) {
    if (error.name !== "AbortError") alert("Could not open folder. Please use Chrome or Edge.");
  }
}
async function childFolder(parent, name) {
  try { return await parent.getDirectoryHandle(name); } catch { return null; }
}
async function scanLessons() {
  lessons = [];
  const categories = ["Repertoire", "Technique/Major Scales", "Technique/Minor Scales", "Theory"];
  for (const category of categories) {
    let folder = courseFolder;
    for (const name of category.split("/")) {
      folder = await childFolder(folder, name);
      if (!folder) break;
    }
    if (folder) await scanInside(folder, category, []);
  }
}
async function scanInside(folder, category, parentNames) {
  for await (const [name, entry] of folder.entries()) {
    if (entry.kind !== "directory") continue;
    const names = [...parentNames, name];
    const fileNames = [];
    for await (const [fileName, fileEntry] of entry.entries()) {
      if (fileEntry.kind === "file") fileNames.push(fileName.toLowerCase());
    }
    if (fileNames.includes("video.mp4") && fileNames.includes("sheet.pdf")) {
      // Expected order: Difficulty / Level / Lesson name
      if (names.length >= 3) {
        lessons.push({
          name, category, difficulty: names[0], level: names[1],
          path: category + "/" + names.join("/"), folder: entry
        });
      }
    } else {
      await scanInside(entry, category, names);
    }
  }
}

function lessonCard(lesson) {
  const doneLabel = isDone(lesson) ? '<div class="done-label">✓ DONE</div>' : "";
  const practiceLabel = inPractice(lesson) ? "★ In Practice" : "☆ Add to Practice";
  const doneButton = isDone(lesson) ? "☑ Done" : "☐ Mark Done";
  return `<article class="lesson-card">${doneLabel}<h4>${escapeHTML(lesson.name)}</h4>
    <div class="muted">${escapeHTML(lesson.difficulty)} · ${escapeHTML(lesson.level)}</div>
    <div class="lesson-actions">
      <button class="primary" data-action="open" data-path="${escapeHTML(lesson.path)}">Open</button>
      <button class="secondary" data-action="practice" data-path="${escapeHTML(lesson.path)}">${practiceLabel}</button>
      <button class="secondary" data-action="done" data-path="${escapeHTML(lesson.path)}">${doneButton}</button>
    </div></article>`;
}
function attachCardEvents() {
  document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      const lesson = findLesson(button.dataset.path);
      if (!lesson) return;
      if (button.dataset.action === "open") openLesson(lesson);
      if (button.dataset.action === "practice") togglePractice(lesson);
      if (button.dataset.action === "done") toggleDone(lesson);
    });
  });
}
function renderPage() {
  const app = document.getElementById("app");
  if (!courseFolder) {
    app.innerHTML = '<section class="empty-state"><h1>PianoPath</h1><p>Open your PianoCourse folder to begin.</p><button id="open-folder-button" class="primary">Open PianoCourse Folder</button></section>';
    document.getElementById("open-folder-button").addEventListener("click", openCourseFolder);
    return;
  }
  if (currentPage === "Practice") return renderPractice(app);
  if (currentPage === "Progress") return renderProgress(app);

  const visible = lessons.filter(lesson =>
    lesson.category === currentPage || lesson.category.startsWith(currentPage + "/"));
  let html = `<div class="heading"><div><h1>${escapeHTML(currentPage)}</h1><div class="muted">${visible.length} lessons</div></div>
    <div><button id="change-folder" class="secondary">Change folder</button> <button id="add-lesson" class="primary">+ Add lesson</button></div></div>`;

  // Group by category, difficulty and level so folders are easy to navigate.
  const groups = {};
  visible.forEach(lesson => {
    const key = [lesson.category, lesson.difficulty, lesson.level].join("|");
    if (!groups[key]) groups[key] = [];
    groups[key].push(lesson);
  });
  Object.keys(groups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).forEach(key => {
    const [category, difficulty, level] = key.split("|");
    html += `<section class="category-section"><h2>${escapeHTML(category.split("/").pop())} · ${escapeHTML(difficulty)}</h2>
      <div class="level-section"><h3>${escapeHTML(level)}</h3><div class="lesson-grid">`;
    groups[key].forEach(lesson => html += lessonCard(lesson));
    html += "</div></div></section>";
  });
  if (!visible.length) html += '<section class="empty-state"><h2>No lessons found</h2><p>Click “+ Add lesson” to add one.</p></section>';
  app.innerHTML = html;
  document.getElementById("change-folder").addEventListener("click", openCourseFolder);
  document.getElementById("add-lesson").addEventListener("click", () => document.getElementById("lesson-form").showModal());
  attachCardEvents();
}
function renderPractice(app) {
  const items = readList(PRACTICE_KEY).map(findLesson).filter(Boolean);
  app.innerHTML = `<div class="heading"><div><h1>Practice</h1><div class="muted">${items.length} lessons selected</div></div></div>` +
    (items.length ? `<div class="lesson-grid">${items.map(lessonCard).join("")}</div>` :
      '<section class="empty-state"><h2>Your practice list is empty</h2><p>Use “☆ Add to Practice” on a lesson card.</p></section>');
  attachCardEvents();
}
function renderProgress(app) {
  const completed = lessons.filter(isDone).length;
  const percent = lessons.length ? Math.round(completed / lessons.length * 100) : 0;
  app.innerHTML = `<div class="heading"><div><h1>Progress</h1><div class="muted">Your completed lessons</div></div></div>
    <section class="lesson-card"><h2>${completed} / ${lessons.length} done</h2><p>${percent}% completed</p>
    <div class="progress-track"><div style="width:${percent}%;height:100%;background:#16834a"></div></div></section>`;
}
function togglePractice(lesson) {
  let list = readList(PRACTICE_KEY);
  list = list.includes(lesson.path) ? list.filter(path => path !== lesson.path) : [...list, lesson.path];
  saveList(PRACTICE_KEY, list);
  renderPage();
}
function toggleDone(lesson) {
  let list = readList(DONE_KEY);
  list = list.includes(lesson.path) ? list.filter(path => path !== lesson.path) : [...list, lesson.path];
  saveList(DONE_KEY, list);
  renderPage();
}

async function createLesson(event) {
  event.preventDefault();
  const category = document.getElementById("lesson-category").value;
  const difficulty = document.getElementById("lesson-difficulty").value;
  const level = document.getElementById("lesson-level").value.trim();
  const name = document.getElementById("lesson-name").value.trim();
  const video = document.getElementById("lesson-video").files[0];
  const sheet = document.getElementById("lesson-sheet").files[0];
  if (!level || !name || !video || !sheet) return alert("Please fill in every field.");

  try {
    let folder = courseFolder;
    for (const part of category.split("/")) folder = await folder.getDirectoryHandle(part, { create: true });
    folder = await folder.getDirectoryHandle(difficulty, { create: true });
    folder = await folder.getDirectoryHandle(level, { create: true });
    folder = await folder.getDirectoryHandle(name, { create: true });
    await copyFile(video, folder, "video.mp4");
    await copyFile(sheet, folder, "sheet.pdf");
    document.getElementById("lesson-form").close();
    document.getElementById("lesson-form-fields").reset();
    // Rescan after saving: this fixes the issue where a new lesson didn't appear.
    await scanLessons();
    renderPage();
  } catch (error) {
    console.error(error);
    alert("Could not save the lesson. Check folder permissions and try again.");
  }
}
async function copyFile(source, folder, newName) {
  const fileHandle = await folder.getFileHandle(newName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(source);
  await writable.close();
}

async function openLesson(lesson) {
  const videoFile = await (await lesson.folder.getFileHandle("video.mp4")).getFile();
  const sheetFile = await (await lesson.folder.getFileHandle("sheet.pdf")).getFile();
  document.getElementById("player-title").textContent = lesson.name;
  document.getElementById("lesson-video-player").src = URL.createObjectURL(videoFile);
  document.getElementById("lesson-sheet-viewer").src = URL.createObjectURL(sheetFile);
  loopStart = loopEnd = null;
  loopEnabled = false;
  document.getElementById("toggle-loop-button").textContent = "A/B Loop: Off";
  document.getElementById("toggle-loop-button").classList.remove("active");
  document.getElementById("player-dialog").showModal();
}
function closeLesson() {
  const video = document.getElementById("lesson-video-player");
  video.pause(); video.removeAttribute("src"); video.load();
  document.getElementById("lesson-sheet-viewer").removeAttribute("src");
  document.getElementById("player-dialog").close();
}
function setA() { loopStart = document.getElementById("lesson-video-player").currentTime; }
function setB() { loopEnd = document.getElementById("lesson-video-player").currentTime; }
function clearAB() { loopStart = loopEnd = null; }
function toggleLoop() {
  loopEnabled = !loopEnabled;
  const button = document.getElementById("toggle-loop-button");
  button.textContent = "A/B Loop: " + (loopEnabled ? "On" : "Off");
  button.classList.toggle("active", loopEnabled);
}
function checkLoop() {
  const video = document.getElementById("lesson-video-player");
  if (loopEnabled && loopStart !== null && loopEnd !== null && loopEnd > loopStart && video.currentTime >= loopEnd) {
    video.currentTime = loopStart;
    video.play();
  }
}

// Connect UI events to functions.
document.getElementById("open-folder-button").addEventListener("click", openCourseFolder);
document.getElementById("cancel-lesson-button").addEventListener("click", () => document.getElementById("lesson-form").close());
document.getElementById("lesson-form-fields").addEventListener("submit", createLesson);
document.getElementById("close-player-button").addEventListener("click", closeLesson);
document.getElementById("set-a-button").addEventListener("click", setA);
document.getElementById("set-b-button").addEventListener("click", setB);
document.getElementById("clear-ab-button").addEventListener("click", clearAB);
document.getElementById("toggle-loop-button").addEventListener("click", toggleLoop);
document.getElementById("lesson-video-player").addEventListener("timeupdate", checkLoop);
document.querySelectorAll(".nav-button").forEach(button => button.addEventListener("click", () => {
  currentPage = button.dataset.page;
  document.querySelectorAll(".nav-button").forEach(nav => nav.classList.toggle("active", nav === button));
  renderPage();
}));
document.addEventListener("keydown", event => {
  if (!document.getElementById("player-dialog").open) return;
  if (event.key === "Escape") closeLesson();
  if (event.key.toLowerCase() === "a") setA();
  if (event.key.toLowerCase() === "b") setB();
  if (event.code === "Space" && event.target.tagName !== "BUTTON") {
    event.preventDefault();
    const video = document.getElementById("lesson-video-player");
    if (video.paused) video.play(); else video.pause();
  }
});
