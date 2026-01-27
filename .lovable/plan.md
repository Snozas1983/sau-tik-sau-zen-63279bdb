
# Sujungtas Planas: Admin Panel ir Google Calendar Pakeitimai

## Apžvalga

Šis planas apjungia visus tris reikalavimus:
1. Darbo laiko 24h formato pakeitimas Admin panelėje
2. "Masažo studija" teksto pašalinimas iš booking puslapio
3. Google Calendar susiejimo sprendimas

---

## 1. Darbo Laiko 24h Formatas

### Problema
Admin panelėje, "Darbo laikas (Pr-Pn)" sekcijoje, naudojamas HTML `<Input type="time">`, kuris rodo AM/PM formatą pagal naršyklės nustatymus.

### Sprendimas
Pakeisti į `TimeInput` komponentą, kuris visada rodo 24h formatą.

### Failas: `src/components/admin/SettingsTab.tsx`

**Pakeitimas 1**: Pridėti TimeInput importą (eilutė 6):
```tsx
import { TimeInput } from '@/components/ui/time-input';
```

**Pakeitimas 2**: Pakeisti "Pradžia" lauką (eilutės 172-176):
```tsx
// Buvo:
<Input
  type="time"
  value={formData.work_start || ''}
  onChange={(e) => setFormData({ ...formData, work_start: e.target.value })}
/>

// Bus:
<TimeInput
  value={formData.work_start || '09:00'}
  onChange={(value) => setFormData({ ...formData, work_start: value })}
/>
```

**Pakeitimas 3**: Pakeisti "Pabaiga" lauką (eilutės 180-184):
```tsx
// Buvo:
<Input
  type="time"
  value={formData.work_end || ''}
  onChange={(e) => setFormData({ ...formData, work_end: e.target.value })}
/>

// Bus:
<TimeInput
  value={formData.work_end || '18:00'}
  onChange={(value) => setFormData({ ...formData, work_end: value })}
/>
```

---

## 2. "Masažo studija" Teksto Pašalinimas

### Problema
Tekstas "Masažo studija" rodomas po logotipu `/booking/:token` puslapyje ir kartojasi su logotipu.

### Sprendimas
Pašalinti abu `<p>` blokus su šiuo tekstu.

### Failas: `src/pages/ManageBooking.tsx`

**Pakeitimas 1**: Ištrinti eilutes 204-209 (error būsenos vaizdas):
```tsx
// IŠTRINTI:
<p 
  className="text-sm text-muted-foreground tracking-[0.2em] mt-2 uppercase"
  style={{ fontFamily: "'Montserrat', sans-serif" }}
>
  Masažo studija
</p>
```

**Pakeitimas 2**: Ištrinti eilutes 246-251 (pagrindinis booking vaizdas):
```tsx
// IŠTRINTI:
<p 
  className="text-sm text-muted-foreground tracking-[0.2em] mt-2 uppercase"
  style={{ fontFamily: "'Montserrat', sans-serif" }}
>
  Masažo studija
</p>
```

---

## 3. Google Calendar Susiejimas Per Kodą

### Dabartinė Problema
403 klaida kyla Google Cloud Console konfigūracijos nesutapimo dėl. Backend kodas veikia teisingai.

### Pasirinkimo Reikalingas Sprendimas

**Variantas A: Service Account (rekomenduojama)**

Privalumai:
- Visiškai automatizuotas, nereikia vartotojo sąveikos
- Tokenas niekada nebaigia galioti
- Stabiliausia ilgalaikė integracija

Reikalavimai (Google Cloud Console):
1. Sukurti Service Account
2. Sugeneruoti JSON raktą
3. Pasidalinti kalendorių su Service Account el. paštu
4. Pridėti secrets į backend:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

Edge Functions pakeitimai:
- `sync-google-calendar` - JWT autentifikacija vietoj OAuth
- `import-google-calendar` - JWT autentifikacija vietoj OAuth
- Pašalinti `google-calendar-auth` ir `google-calendar-callback` (nebereikalingos)

UI pakeitimai:
- Pašalinti "Susieti su Google Calendar" mygtuką
- Palikti tik sinchronizacijos būseną ir "Sinchronizuoti dabar" mygtuką

**Variantas B: Išspręsti 403 ir paslėpti mygtuką po susiejimo**

1. Pirma kartą autorizuoti per OAuth (išsprendus 403 problemą)
2. Po sėkmingo susiejimo, mygtukas automatiškai paslepiamas
3. Lieka tik sinchronizacijos valdymo mygtukai

---

## Įgyvendinimo Seka

### Etapas 1: UI Pakeitimai (galima daryti iš karto)

| Failas | Pakeitimas |
|--------|------------|
| `SettingsTab.tsx` | TimeInput importas + 2 laukų pakeitimai |
| `ManageBooking.tsx` | 2 teksto blokų ištrynimas |

### Etapas 2: Google Calendar (reikia jūsų pasirinkimo)

Prašau pasirinkti variantą:
- **A**: Įgyvendinti Service Account (reikės Google Cloud Console veiksmų)
- **B**: Paslėpti mygtuką po susiejimo (pirma reikės išspręsti 403 klaidą)

---

## Techninis Kontekstas

### TimeInput Komponentas
Jau egzistuoja `src/components/ui/time-input.tsx` ir generuoja:
- Valandas: 00, 01, 02, ... 22, 23
- Minutes: 00, 15, 30, 45

### Google Calendar OAuth Flow
```text
[Admin Dashboard] → [google-calendar-auth] → [Google OAuth] 
                 → [google-calendar-callback] → [tokens saved]
```

403 klaida kyla žingsnyje 3 dėl Google Cloud Console konfigūracijos.
