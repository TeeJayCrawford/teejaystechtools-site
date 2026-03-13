# TeeJay's Tech Tools site

Static multi-page website for free hosting on GitHub Pages.

## Pages

- `index.html` — home
- `services.html` — service overview
- `about.html` — background and experience
- `faq.html` — common questions
- `contact.html` — email/phone/contact form

## Contact wiring

Current calls to action point to:

- Email: `teejaycrawford@gmail.com`
- Phone: `573-854-1909`

## Logo swap

The page uses clean placeholder blocks so you can replace them with final PNG logos later.

Suggested future files:

- `assets/logo-nav.png`
- `assets/logo-main.png`
- `assets/logo-footer.png`

## Local preview

```bash
cd ~/.openclaw/workspace/teejaystechtools-site
python3 -m http.server 8000 --bind 127.0.0.1
```

Open:

- http://127.0.0.1:8000

## GitHub Pages deploy

1. Create a GitHub repo
2. Put these files in the repo root
3. Go to **Settings → Pages**
4. Choose:
   - **Source:** Deploy from a branch
   - **Branch:** `main` / `/ (root)`
5. Save

## Custom domain

The included `CNAME` file points to:

- `teejaystechtools.com`

For root/apex domain hosting on GitHub Pages, add these A records at your DNS provider:

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

Optional `www` record:

- `www` → `<your-github-username>.github.io`
