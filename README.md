# Web Piano Path

A simple local web app for organizing and practicing piano lessons from your own folders.

## Features

- Scan a local course folder and display lessons by category & level
- Create new lessons
- Practice mode with video + sheet music viewer
- A/B loop for focused practice
- Mark lessons as **Done**
- Progress tracking
- Status saved in browser `localStorage`

## Files

| File         | Description                                      |
|--------------|--------------------------------------------------|
| `index.html` | Page structure                                   |
| `style.css`  | Styling                                          |
| `script.js`  | Folder scanning, create lesson, Practice, Done, Progress & A/B loop |

## How to run

1. Extract this ZIP (or clone the repo).
2. Open `index.html` in **Chrome** or **Edge**.
3. Click **Open PianoCourse Folder** and select your course root folder.

> Note: The app uses the File System Access API, so it works best in Chromium-based browsers.

## Expected folder structure

```
PianoCourse/
├── Repertoire/
│   └── Beginner/
│       └── Level 1/
│           └── Ode to Joy/
│               ├── video.mp4
│               └── sheet.pdf
└── Technique/
    └── Major Scales/
        └── Beginner/
            └── Level 1/
                └── C Major/
                    ├── video.mp4
                    └── sheet.pdf
```

**Important:** Each lesson folder must directly contain `video.mp4` and `sheet.pdf`.

After adding a new lesson, the site rescans the folders and refreshes the page.

## Notes

- Practice and Done status are stored in the browser's `localStorage`.
- No server or internet connection required after loading the page.
