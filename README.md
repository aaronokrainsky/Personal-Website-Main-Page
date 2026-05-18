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

## Analytics

Vercel Web Analytics is wired into `index.html` using the static HTML script snippet:

```html
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
```

Analytics data will only collect after Web Analytics is enabled in the Vercel dashboard and this change is deployed to Vercel.

## License

All rights reserved. See `LICENSE.md` for permitted use and restrictions.
