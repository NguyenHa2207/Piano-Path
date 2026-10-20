let lessons = [],
  sessions = [],
  page = "Repertoire",
  difficultyFilter = "Beginner",
  a = null,
  b = null,
  loopOn = false;
const app = document.getElementById("app"),
  themeKey = "pianopath-theme";
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
async function api(url, options = {}) {
  const r = await fetch(url, options),
    d = await r.json();
  if (!r.ok) throw Error(d.error || "Request failed");
  return d;
}
async function load() {
  try {
    lessons = await api("/api/lessons");
    sessions = await api("/api/practice-sessions");
    render();
  } catch (e) {
    app.innerHTML = `<section class="empty-state"><h1>PianoPath</h1><p>Could not connect. Run start.bat and open http://localhost:3000.</p><p>${esc(e.message)}</p></section>`;
  }
}
function card(l) {
  return `<article class="lesson-card">${l.is_done ? '<div class="done-label">✓ DONE</div>' : ""}<h3>${esc(l.title)}</h3><p class="muted">${esc(l.difficulty)} · ${esc(l.level)}</p><div class="lesson-actions"><button class="primary" data-act="open" data-id="${l.id}">Open</button><button class="secondary" data-act="practice" data-id="${l.id}">${l.in_practice ? "★ In Practice" : "☆ Add to Practice"}</button><button class="secondary" data-act="done" data-id="${l.id}">${l.is_done ? "☑ Done" : "☐ Mark Done"}</button><button class="secondary" data-act="log" data-id="${l.id}">Log practice</button><button class="danger" data-act="delete" data-id="${l.id}">Delete</button></div></article>`;
}
function render(){
  document.querySelectorAll(".nav-button").forEach(x=>x.classList.toggle("active",x.dataset.page===page));

  // ===== Tab Progress =====
  if(page==="Progress"){
    const done=lessons.filter(x=>x.is_done).length;
    const mins=sessions.reduce((n,x)=>n+x.duration_minutes,0);
    const pct=lessons.length?Math.round(done/lessons.length*100):0;
    app.innerHTML=`
      <div class="heading"><h1>Progress</h1></div>
      <div class="stats-grid">
        <article class="lesson-card">Completed<h2>${done} / ${lessons.length}</h2></article>
        <article class="lesson-card">Practice time<h2>${mins} min</h2></article>
        <article class="lesson-card">Sessions<h2>${sessions.length}</h2></article>
      </div>
      <article class="lesson-card">
        <h3>${pct}% completed</h3>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <h3>Recent practice</h3>
        ${sessions.slice(0,10).map(s=>`
          <p><b>${esc(s.lesson_title)}</b> — ${s.duration_minutes} min · ${esc(formatTime(s.practiced_at))}
          ${s.notes?"<br>"+esc(s.notes):""}</p>
        `).join("") || '<p class="muted">No sessions yet.</p>'}
      </article>`;
    return;
  }

  // ===== Tab khác =====
  let list = page==="Practice"
    ? lessons.filter(x=>x.in_practice)
    : lessons.filter(x=>(x.category===page || x.category.startsWith(page+"/")) && x.difficulty===difficultyFilter);

  let html=`
    <div class="heading">
      <div>
        <h1>${esc(page)}</h1>
        <p class="muted">${list.length} lessons</p>
      </div>
      <button id="add" class="primary">+ Add lesson</button>
    </div>
  `;

  // Bộ lọc độ khó (không hiện ở tab Practice)
  if(page!=="Practice"){
    html+=`
      <div class="difficulty-tabs">
        <button class="diff-btn ${difficultyFilter==="Beginner"?"active":""}" data-diff="Beginner">Beginner</button>
        <button class="diff-btn ${difficultyFilter==="Intermediate"?"active":""}" data-diff="Intermediate">Intermediate</button>
        <button class="diff-btn ${difficultyFilter==="Advanced"?"active":""}" data-diff="Advanced">Advanced</button>
      </div>
    `;
  }

  if(!list.length){
    html+=`<section class="empty-state"><h2>No lessons yet</h2><p>Click “+ Add lesson” to begin.</p></section>`;
  }else{
    const groups={};
    list.forEach(l=>{
      const k=[l.category,l.difficulty,l.level].join("|");
      (groups[k]??=[]).push(l);
    });
    Object.keys(groups).sort().forEach(k=>{
      const [c,d,lev]=k.split("|");
      html+=`
        <section class="category-section">
          <h4>${esc(lev)}</h4>
          <div class="lesson-grid">${groups[k].map(card).join("")}</div>
        </section>`;
    });
  }

  app.innerHTML=html;

  // Sự kiện nút Add
  document.getElementById("add").onclick=()=>{
    document.getElementById("form-message").textContent="";
    document.getElementById("lesson-form").showModal();
  };

  // Sự kiện lọc độ khó
  document.querySelectorAll(".diff-btn").forEach(btn=>{
    btn.onclick=()=>{
      difficultyFilter=btn.dataset.diff;
      render();
    };
  });

  // Sự kiện các nút Open / Practice / Done / Log / Delete
  document.querySelectorAll("[data-act]").forEach(btn=>btn.onclick=async()=>{
    const l=lessons.find(x=>x.id===+btn.dataset.id);
    try{
      switch(btn.dataset.act){
        case"open": openLesson(l); break;
        case"practice":
          await api(`/api/lessons/${l.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({in_practice:!l.in_practice})});
          await load(); break;
        case"done":
          await api(`/api/lessons/${l.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({is_done:!l.is_done})});
          await load(); break;
        case"log":
          document.getElementById("practice-id").value=l.id;
          document.getElementById("practice-title").textContent=l.title;
          document.getElementById("practice-form").showModal(); break;
        case"delete":
          if(confirm(`Delete ${l.title} and its files?`)){
            await api(`/api/lessons/${l.id}`,{method:"DELETE"});
            await load();
          }
          break;
      }
    }catch(e){alert(e.message)}
  });
}
function formatTime(utcStr) {
  if (!utcStr) return "";
  // SQLite CURRENT_TIMESTAMP là UTC → thêm Z để JS hiểu đúng
  const d = new Date(utcStr.replace(" ", "T") + "Z");

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hour}:${minute}:${String(d.getSeconds()).padStart(2, "0")}`;
}
function updateLoopButtons() {
  const sa = document.getElementById("set-a"),
    sb = document.getElementById("set-b"),
    cl = document.getElementById("clear-ab"),
    lp = document.getElementById("loop");
  sa.classList.toggle("is-set", a !== null);
  sb.classList.toggle("is-set", b !== null);
  cl.classList.toggle("is-active", a === null && b === null);
  lp.classList.toggle("is-active", loopOn);
  sa.setAttribute("aria-pressed", String(a !== null));
  sb.setAttribute("aria-pressed", String(b !== null));
  lp.setAttribute("aria-pressed", String(loopOn));
  sa.title =
    a === null
      ? "Set loop start point"
      : "A set at " + a.toFixed(2) + " seconds";
  sb.title =
    b === null ? "Set loop end point" : "B set at " + b.toFixed(2) + " seconds";
}
function openLesson(l) {
  document.getElementById("player-title").textContent = l.title;
  document.getElementById("video").src = l.video_path;

  const sheet = document.getElementById("sheet");
  const empty = document.getElementById("sheet-empty");
  const open = document.getElementById("sheet-open");

  // Xóa src cũ trước
  sheet.removeAttribute("src");

  if (l.sheet_path && l.sheet_path.trim() !== "") {
    // Dùng embed thay vì iframe
    sheet.src = l.sheet_path;
    sheet.hidden = false;
    empty.hidden = true;
    open.href = l.sheet_path;
    open.hidden = false;
  } else {
    sheet.hidden = true;
    empty.hidden = false;
    open.hidden = true;
    open.removeAttribute("href");
  }

  a = b = null;
  loopOn = false;
  document.getElementById("loop").textContent = "A/B Loop: Off";
  updateLoopButtons();
  document.getElementById("player").showModal();
}
function closePlayer() {
  const v = document.getElementById("video");
  v.pause();
  v.removeAttribute("src");
  v.load();
  document.getElementById("sheet").removeAttribute("src");
  document.getElementById("sheet-open").removeAttribute("href");
  document.getElementById("player").close();
}
document.getElementById("lesson-fields").onsubmit = async (e) => {
  e.preventDefault();
  const f = e.currentTarget,
    msg = document.getElementById("form-message"),
    btn = f.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true;
  msg.textContent = "Saving lesson and files...";
  try {
    await api("/api/lessons", { method: "POST", body: new FormData(f) });
    f.reset();
    f.elements.level.value = "Level 1";
    document.getElementById("lesson-form").close();
    await load();
  } catch (err) {
    msg.textContent = err.message;
  } finally {
    if (btn) btn.disabled = false;
  }
};
document.getElementById("cancel-lesson").onclick = () =>
  document.getElementById("lesson-form").close();
document.getElementById("close-player").onclick = closePlayer;
document.getElementById("set-a").onclick = () => {
  a = document.getElementById("video").currentTime;
  updateLoopButtons();
};
document.getElementById("set-b").onclick = () => {
  b = document.getElementById("video").currentTime;
  updateLoopButtons();
};
document.getElementById("clear-ab").onclick = () => {
  a = b = null;
  loopOn = false;
  document.getElementById("loop").textContent = "A/B Loop: Off";
  updateLoopButtons();
};
document.getElementById("loop").onclick = () => {
  loopOn = !loopOn;
  document.getElementById("loop").textContent =
    "A/B Loop: " + (loopOn ? "On" : "Off");
  updateLoopButtons();
};
document.getElementById("video").ontimeupdate = () => {
  const v = document.getElementById("video");
  if (loopOn && a !== null && b !== null && b > a && v.currentTime >= b) {
    v.currentTime = a;
    v.play();
  }
};
document.getElementById("practice-fields").onsubmit = async (e) => {
  e.preventDefault();
  const form = e.currentTarget; // lấy form trước khi await
  try {
    await api("/api/practice-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lesson_id: +document.getElementById("practice-id").value,
        duration_minutes: +document.getElementById("duration").value,
        notes: document.getElementById("notes").value,
      }),
    });
    document.getElementById("practice-form").close();
    form.reset(); // dùng biến đã lưu
    await load();
  } catch (err) {
    alert(err.message);
  }
};
document.getElementById("cancel-practice").onclick = () =>
  document.getElementById("practice-form").close();
function setTheme(t) {
  document.body.dataset.theme = t;
  document.getElementById("theme-toggle").textContent =
    t === "dark" ? "☀️ Light mode" : "🌙 Dark mode";
}
setTheme(localStorage.getItem(themeKey) || "light");
document.getElementById("theme-toggle").onclick = () => {
  const t = document.body.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(themeKey, t);
  setTheme(t);
};
document.querySelectorAll(".nav-button").forEach(
  (x) =>
    (x.onclick = () => {
      page = x.dataset.page;
      render();
    }),
);
load();
