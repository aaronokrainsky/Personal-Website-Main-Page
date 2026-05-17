# Aaron Okrainsky Personal Website

Static personal portfolio for Aaron Okrainsky, focused on biomedical engineering, CAD, prototyping, and BraceForge.

## Local Development

Serve the site from the project root:

```powershell
python -m http.server 5173 --bind 127.0.0.1
```

Open:

```text
http://127.0.0.1:5173/
```

## Vercel

This is a static site with no build step.

Recommended Vercel settings:

- Framework Preset: Other
- Build Command: leave empty
- Output Directory: `.`
- Install Command: leave empty

The included `vercel.json` enables clean URLs and disables trailing slashes.
