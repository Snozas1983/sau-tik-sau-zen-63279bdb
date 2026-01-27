
# Planas: Automatinė Google Calendar sinchronizacija kas 30 min (fone)

## Apžvalga

Sukurti pilnai automatinę sinchronizaciją, kuri veiks serveryje nepriklausomai nuo to, ar atidaryta naršyklė.

---

## Sprendimas

### 1. Modifikuoti `system-bookings` Edge funkciją

**Failas:** `supabase/functions/system-bookings/index.ts`

Pridėti Google Calendar importo logiką funkcijos pabaigoje:

```typescript
// Pagrindinio darbo pabaigoje, prieš return:

// Trigger Google Calendar import
try {
  const response = await fetch(
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/import-google-calendar`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    }
  );
  
  if (response.ok) {
    const syncResult = await response.json();
    actions.push(`Google Calendar sync: ${syncResult.created} imported, ${syncResult.deleted} removed`);
  }
} catch (err) {
  console.error('Google Calendar sync error:', err);
}
```

### 2. Sukurti cron job kas 30 minučių

**SQL komanda** (bus įvykdyta duomenų bazėje):

```sql
SELECT cron.schedule(
  'system-bookings-and-sync',
  '*/30 * * * *',   -- Kas 30 minučių
  $$
  SELECT net.http_post(
    url := 'https://gwjdijkbmesjoqmfepkc.supabase.co/functions/v1/system-bookings',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ANON_KEY"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Kaip tai veiks

```text
┌─────────────────────────────────────────────────────────────────┐
│                         SERVERIS                                │
│                                                                 │
│   ┌──────────┐     ┌───────────────────┐     ┌───────────────┐ │
│   │ pg_cron  │────►│  system-bookings  │────►│ import-google │ │
│   │ kas 30m  │     │  Edge Function    │     │    -calendar  │ │
│   └──────────┘     └───────────────────┘     └───────────────┘ │
│                            │                         │          │
│                            ▼                         ▼          │
│                    Sukuria/atšaukia          Importuoja iš      │
│                    sistemos booking          Google Calendar    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
       │
       │  Veikia 24/7, nepriklausomai ar atidaryta naršyklė
       ▼
```

---

## Privalumai

| Aspektas | Nauda |
|----------|-------|
| Veikia fone | Nereikia atidaryti jokio puslapio |
| Vienas cron job | Ir sistema, ir sinchronizacija veikia kartu |
| Kas 30 min | Pakankamas dažnumas, nėra per daug užklausų |
| Patikimumas | `pg_cron` yra stabilus ir veikia duomenų bazės lygyje |

---

## Alternatyvos dėl kliento valdymo tokeno

Jūsų pasiūlytas variantas (paleisti sinchronizaciją kai klientas atidaro valdymo puslapį) **taip pat veiktų kaip papildomas triggeris**:

**Failas:** `src/pages/ManageBooking.tsx`

Kai klientas užkrauna puslapį, galime "tyliai" paleisti sinchronizaciją fone:

```typescript
useEffect(() => {
  // Trigger background sync when client opens management page
  fetch(`${supabaseUrl}/functions/v1/import-google-calendar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }).catch(() => {}); // Ignore errors - this is optional
}, []);
```

Tačiau tai būtų **papildomas** metodas, o **pagrindinis** turėtų būti `pg_cron` kas 30 min.

---

## Failų sąrašas

| Failas | Veiksmas |
|--------|----------|
| `supabase/functions/system-bookings/index.ts` | Modifikuoti - pridėti import-google-calendar iškvietimą |
| Duomenų bazė (SQL) | Sukurti cron job |
| `src/pages/ManageBooking.tsx` (neprivaloma) | Pridėti papildomą sync triggerį |

---

## Įgyvendinimo eiliškumas

1. Atnaujinti `system-bookings` funkciją su Google Calendar sync logika
2. Sukurti `pg_cron` job kas 30 minučių
3. Testuoti ar veikia automatiškai

