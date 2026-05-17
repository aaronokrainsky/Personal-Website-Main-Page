# Personal Website Main Page - Project Notes

Last updated: May 17, 2026

## Repository

- GitHub repository: `Personal-Website-Main-Page`
- Owner: `aaronokrainsky`
- URL: `https://github.com/aaronokrainsky/Personal-Website-Main-Page`
- Local branch: `master`
- Local project path: `C:\Users\aaron\Coding\Intellij\IdeaProjects\Personal Website Main Page`

## Project Goal

Build a personal website for Aaron Okrainsky that introduces him and presents his engineering work. The site should feel more biomedical engineering / device prototyping focused than a generic software portfolio.

The current site is a static HTML/CSS/JavaScript website with:

- A hero section for Aaron's identity and engineering focus
- An about section with BME, CAD, FEA, and prototyping details
- A main BraceForge project section
- Experience highlights from the resume
- Contact links
- A local browser-based view counter

## Aaron's Profile Details

- Name: Aaron Okrainsky
- Email: `aaronokrainsky@gmail.com`
- LinkedIn: `https://www.linkedin.com/in/aaron-okrainsky/`
- Education: Biomedical Engineering student at Rutgers University
- Program/context: Rutgers Honors College, School of Engineering, class of 2029
- GPA from resume: 4.0
- Location from resume: Oradell, NJ
- Career interest from resume: Summer 2026 internship/co-op in medical device R&D or hardware engineering

## Resume Details Used

Resume source provided by user:

- Original file: `C:\Users\aaron\OneDrive - Rutgers University\Misc\Resume_04_23.pdf`
- Copied into project: `assets/Aaron-Okrainsky-Resume.pdf`

Resume summary:

- Biomedical engineering student specializing in CAD-driven design and prototyping of medical devices
- Hands-on experience in prosthetics development and ergonomic system design

Education:

- Rutgers University, New Brunswick, NJ
- Bachelor of Science in Biomedical Engineering, Aug. 2025 - May 2029
- Honors College of Engineering
- Dean's List
- Dean's Scholarship
- Relevant coursework: Multivariable Calculus, Statics, CAD for Engineering, Intro to Biomedical Engineering, Biomedical Engineering Systems Physiology

Experience:

- RU-ENABLE, EGC Representative
  - Prosthetics-focused organization
  - Helped push for prosthetic material funding and coordinate interdepartmental logistics
  - Collaborating with 8+ members on 3 prosthetic designs for underprivileged communities
  - Developed/refined 4+ CAD prototypes for prosthetic limbs

- Rutgers Formula Racing, Ergonomics Team Member
  - Throttle, steering, and driver-interface systems
  - Designed a 3-piece 3D printed PLA modular system for testing throttle pedal angles
  - Reduced testing setup time by about 25 percent
  - Used SolidWorks FEA on ergonomic components
  - Produced manufacturing-ready engineering drawings

- Next Generation Pediatric Urgent Care, Medical Assistant
  - Supported clinical workflow for 100+ patients weekly
  - Recorded vitals and histories in EMR software
  - Administered COVID, flu, and strep diagnostic tests
  - Helped with scheduling and medical records

Skills:

- Software/tools: SolidWorks, MATLAB, R, Onshape, Microsoft Office Suite
- Technical: CAD modeling, FEA, 3D printing, parametric design, engineering drawings
- Certifications: SolidWorks CSWA, AHA BLS/CPR

## BraceForge

Main project:

- BraceForge URL: `https://braceforge.aaronokrainsky.com/`
- Current site positions BraceForge as Aaron's main and basically only project.

What was learned from the BraceForge website:

- Title: BraceForge
- Main headline: custom wrist brace design, ready for 3D printing
- Purpose: build a two-part wrist brace from real hand measurements
- Workflow:
  - Measure: enter forearm, wrist, palm, and thumb opening dimensions
  - Preview: inspect the mirrored left or right brace with thumb clearance, strap slots, and smooth edges
  - Export: download generated STL/3MF and check it in slicer software before printing
- Has an interactive 3D preview using Three.js
- Includes a medical disclaimer: not medical advice and not intended to provide real medical support, diagnosis, treatment, or professional care
- Created by Aaron Okrainsky, 2026

BraceForge visual/color direction:

- Green and gold are important to incorporate
- Existing BraceForge colors observed from the site:
  - Green/accent: `#15543f`
  - Gold/accent: `#b4873e`
  - Light background: `#eef3f2` / `#eaf0ee`
  - Ink: `#182322`

## Current Site Files

- `index.html`: page structure and content
- `styles.css`: responsive styling, brighter dark palette, BraceForge green/gold section styling
- `script.js`: local browser view counter using `localStorage`
- `braceforge-render.js`: copied/adapted BraceForge Three.js renderer used for the live wrist brace preview
- `assets/hero-bme-prototyping.png`: generated hero image for BME/CAD/prototyping theme
- `assets/hero-workspace.png`: older generated developer-workspace hero image retained in assets
- `assets/Aaron-Okrainsky-Resume.pdf`: local copy of resume
- `.gitignore`: ignores IntelliJ project metadata

## Current Design Direction

The user wanted:

- More BME / engineering focus
- Text based on Aaron's resume and personal info
- BraceForge as the central project
- A brighter color scheme
- The BraceForge section to incorporate green and gold
- The "Open BraceForge" button to pop out more
- A website view counter

Current implementation:

- Dark but brighter engineering-style palette
- Hero image shows biomedical engineering prototyping, CAD, calipers, lab bench, and a wrist brace prototype
- BraceForge CTA is now a prominent gold button with an arrow and hover lift
- BraceForge section uses green/gold gradients and matching project tokens
- View counter is shown in the footer as "Local site views"
- BraceForge's Three.js model renderer is being incorporated into the personal site from the local BraceForge source in `C:\Users\aaron\Coding\Intellij\IdeaProjects\test-project\app.js`.
- The BraceForge section now embeds the actual generated wrist brace preview and rotates it based on page scroll.

## 3D BraceForge Preview

The personal website now includes a live Three.js BraceForge model inside the BraceForge section.

Implementation notes:

- Source copied from local BraceForge project: `C:\Users\aaron\Coding\Intellij\IdeaProjects\test-project\app.js`
- Portfolio copy: `braceforge-render.js`
- The portfolio page adds the same hidden default measurement inputs used by the BraceForge homepage preview.
- The renderer mounts into `#braceViewport`.
- Three.js is loaded through an import map from `https://unpkg.com/three@0.164.1/`.
- Scroll-based rotation is implemented in `updateScrollSpin()` inside `braceforge-render.js`.
- The model is intentionally preview-only on the personal site; the primary full configurator remains linked through the `Open BraceForge` button.

Verification performed:

- Playwright Chromium installed locally for testing.
- Desktop viewport: canvas rendered, nonblank pixel variance detected, image changed after scroll.
- Mobile viewport: canvas rendered, nonblank pixel variance detected, image changed after scroll.
- Screenshot outputs were written under `tmp/playwright/` during verification and are ignored by git.

## View Counter Note

The local view counter was removed from the public page.

For a real public view counter after deployment, add a backend or service such as:

- Supabase
- Firebase
- Vercel serverless function with a database
- GitHub Pages plus an external counter API
- Plausible/GoatCounter/analytics-style service

## Local Development

The site can be served locally with Python:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Local URL:

```text
http://127.0.0.1:5173/
```

The page has already been verified locally with HTTP 200 responses for:

- `/`
- `/assets/hero-bme-prototyping.png`
- `/assets/Aaron-Okrainsky-Resume.pdf`

## Vercel Launch Prep

The personal site is prepared as a static Vercel deployment:

- `vercel.json` enables clean URLs and disables trailing slashes.
- `.vercelignore` excludes local IDE, git, and temporary files from deployment upload.
- `README.md` documents local development and recommended Vercel settings.
- No build step is required.

Recommended Vercel settings:

- Framework Preset: Other
- Build Command: leave empty
- Output Directory: `.`
- Install Command: leave empty

## Live BraceForge Links

- BraceForge app: `https://braceforge.aaronokrainsky.com/`
- BraceForge case study: `https://braceforge.aaronokrainsky.com/case-study`
- The personal website links to both from the BraceForge project section.

## Git / GitHub History

- Initial commit message: `Build biomedical engineering portfolio site`
- GitHub CLI was installed with `winget`
- GitHub authentication was completed with:

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" auth login --hostname github.com --web --git-protocol https
```

- Original repository name created by CLI: `personal-website-main-page`
- User renamed repository to: `Personal-Website-Main-Page`
- Local `origin` should point to:

```text
https://github.com/aaronokrainsky/Personal-Website-Main-Page.git
```

## Things To Ask / Improve Later

- Add a real headshot or engineering/lab photo if Aaron wants a more personal feel
- Decide whether the site should lean more "resume/recruiting" or "project/lab notebook"
- Add GitHub link if Aaron wants it public on the page
- Deploy the site, likely with GitHub Pages, Netlify, or Vercel
- Replace local view counter with a public counter if needed
- Consider removing the older `assets/hero-workspace.png` if it is no longer used
- Add a better mobile screenshot check before final deployment
