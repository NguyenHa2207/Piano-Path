# PianoPath

A personal piano practice app that runs fully offline on your local machine.

Watch lesson videos side-by-side with sheet music PDFs, organize pieces by category / difficulty / level, track practice sessions, and monitor your progress.

## Demo Video

https://github.com/user-attachments/assets/51bbf101-fb43-4222-9f83-bbc876c26b63

## Features

- Add lessons with video (MP4) and optional sheet music (PDF)
- Organize by:
  - **Category**: Repertoire / Technique / Theory
  - **Difficulty**: Beginner / Intermediate / Advanced
  - **Level**: Level 1, Level 2, ...
- Difficulty filter tabs inside each category
- Practice list (mark pieces you're currently working on)
- Mark lessons as Done
- Log practice sessions (duration + notes)
- Progress tab: completion stats, total practice time, recent history
- Video player with **A/B Loop** (repeat a section)
- View PDF sheet music inside the app
- Dark mode / Light mode
- All data stored in SQLite (completely offline)

## Tech Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- Database: better-sqlite3
- File upload: Multer

## Installation & Usage

### Requirements
- [Node.js](https://nodejs.org/) (LTS recommended)

### Steps

1. Clone or download this repository
2. Open a terminal in the project folder
3. Install dependencies:

```bash
npm install
```

4. Start the server:

**Windows:**
```bash
start.bat
```

**Or manually:**
```bash
node server.js
```

5. Open your browser at: [http://localhost:3000](http://localhost:3000)

> **Important:** Do not open `public/index.html` directly. Always run through the server.

## Project Structure

```
PianoPath/
├── public/                 # Frontend files
│   ├── index.html
│   ├── style.css
│   └── script.js
├── PianoCourse/            # Uploaded videos & PDFs (auto-created)
├── data/                   # SQLite database (auto-created)
│   └── pianopath.db
├── server.js
├── package.json
├── start.bat
└── README.md
```

## How to Use

1. Click **+ Add lesson**
2. Select Category, Difficulty, Level and enter a title
3. Upload a `.mp4` video (required) and optional `.pdf` sheet music
4. Open a lesson → watch the video and view the sheet at the same time
5. Use **Set A / Set B** to loop a difficult section
6. Click **Log practice** to record a practice session
7. Check your progress in the **Progress** tab

## Important Notes

- All data lives in the `data/` and `PianoCourse/` folders
- To back up: simply copy these two folders
- Do **not** commit `node_modules/`, `data/`, or `PianoCourse/` to GitHub
- This app is intended for personal local use only — do not expose the server to the internet

MIT – Free for personal use.
