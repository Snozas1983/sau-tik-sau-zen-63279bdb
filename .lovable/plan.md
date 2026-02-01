

# Planas: Pridėti Supabase aplinkos kintamuosius į GitHub Actions

## Problema
GitHub Actions workflow neturi Supabase aplinkos kintamųjų (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`), todėl `npm run build` sukuria aplikaciją be backend prisijungimo ir kalendorius neveikia.

## Sprendimas

### 1 žingsnis: Pridėti GitHub Secrets (rankiniu būdu)

Eik į GitHub → `Snozas1983/sautiksau2` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Pridėk šiuos du secrets:

| Secret Name | Value |
|-------------|-------|
| `VITE_SUPABASE_URL` | `https://gwjdijkbmesjoqmfepkc.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3amRpamtibWVzam9xbWZlcGtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNTQyMDEsImV4cCI6MjA4MjkzMDIwMX0.CuOukchqVf6Pq69FVYKsxTsZA2YavCAMVmsFLSnzw7E` |

### 2 žingsnis: Atnaujinti deploy.yml

Pakeisti build žingsnį, kad naudotų aplinkos kintamuosius:

```yaml
- name: 📦 Instaliuojama ir gaminama (Build)
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
  run: |
    npm install
    npm run build
```

## Failų pakeitimai

| Failas | Pakeitimas |
|--------|------------|
| `.github/workflows/deploy.yml` | Pridėti `env:` bloką su Supabase kintamaisiais prie build žingsnio (eilutės 18-21) |

## Po pakeitimo

```yaml
name: Deploy Lovable Project
on:
  push:
    branches:
      - main
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: 🚚 Parsiunčiamas kodas
        uses: actions/checkout@v4

      - name: 🟢 Paruošiamas Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: 📦 Instaliuojama ir gaminama (Build)
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
        run: |
          npm install
          npm run build

      - name: 📂 Keliama į Hostinger
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./dist/
          server-dir: ./public_html/
          dangerous-clean-slate: true
```

## Rezultatas
- Build procesas turės prieigą prie Supabase
- Kalendorius ir visos funkcijos veiks Hostinger svetainėje
- Po push į main, automatiškai bus įkelta nauja versija

