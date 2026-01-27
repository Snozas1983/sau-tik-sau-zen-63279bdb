
# Planas: STS prefiksas ir sistemos rezervacijų sinchronizacija

## Apžvalga

Pridėti "STS" prefiksą visiems Sau Tik Sau įrašams Google Calendar ir užtikrinti, kad sisteminės rezervacijos būtų sinchronizuojamos į Google.

---

## Pakeitimai

### 1. Atnaujinti `sync-google-calendar` funkciją

**Failas:** `supabase/functions/sync-google-calendar/index.ts`

Pakeisti įvykių pavadinimų formatą:

| Tipas | Dabartinis formatas | Naujas formatas |
|-------|---------------------|-----------------|
| Sistema | `[SISTEMA] Užimta` | `STS Užimta` |
| Klientas | `Jonas - Masažas` | `STS Jonas - Masažas` |

**Kodo pakeitimas (eilutės 105-108):**
```typescript
const event = {
  summary: isSystem 
    ? 'STS Užimta' 
    : `STS ${booking.customer_name} - ${booking.service_name || 'Paslauga'}`,
  // ...
};
```

---

### 2. Atnaujinti `import-google-calendar` funkciją

**Failas:** `supabase/functions/import-google-calendar/index.ts`

#### a) Pakeisti filtrą - atpažinti STS įrašus

Dabar sistema filtruoja pagal `[SISTEMA]` ir ` - `. Reikia pakeisti į STS:

```typescript
const externalEvents = googleEvents.filter(event => {
  const summary = event.summary || '';
  // Jei prasideda STS - tai mūsų įrašas, praleisti
  if (summary.startsWith('STS ')) return false;
  return true;
});
```

#### b) Pridėti senų įrašų pataisymą

Po importavimo logikos pridėti funkciją, kuri:
1. Randa visus Google Calendar įrašus be STS prefikso, kurie turėtų jį turėti
2. Atnaujina jų pavadinimus pridedant STS

```typescript
// Pataisyti senus įrašus be STS prefikso
const eventsNeedingUpdate = googleEvents.filter(event => {
  const summary = event.summary || '';
  // Jei prasideda [SISTEMA] arba atrodo kaip mūsų formatas - reikia atnaujinti
  if (summary.startsWith('[SISTEMA]')) return true;
  // Jei yra "Vardas - Paslauga" formatas ir ne STS
  if (summary.includes(' - ') && !summary.includes('@') && !summary.startsWith('STS ')) return true;
  return false;
});

for (const event of eventsNeedingUpdate) {
  const oldSummary = event.summary || '';
  let newSummary = oldSummary;
  
  if (oldSummary.startsWith('[SISTEMA]')) {
    newSummary = 'STS Užimta';
  } else {
    newSummary = `STS ${oldSummary}`;
  }
  
  // Atnaujinti Google Calendar įrašą
  await updateGoogleEvent(accessToken, calendarId, event.id, { summary: newSummary });
  stats.updated++;
}
```

---

### 3. Atnaujinti `system-bookings` funkciją

**Failas:** `supabase/functions/system-bookings/index.ts`

Po kiekvieno sisteminės rezervacijos sukūrimo iš karto sinchronizuoti su Google Calendar:

```typescript
// Po createSystemBooking funkcijos - gauti booking ID ir iškviesti sync
async function createSystemBooking(
  supabase: SupabaseClient,
  date: string,
  slot: { service: Service; startTime: string; endTime: string },
  actionDay: number
): Promise<string | null> {  // Grąžinti booking ID
  const { data, error } = await supabase.from('bookings').insert({
    // ... esami laukai
  }).select('id').single();
  
  if (error || !data) return null;
  
  // Sinchronizuoti su Google Calendar
  await syncToGoogleCalendar(data.id, 'create');
  
  return data.id;
}
```

Pridėti helper funkciją Google Calendar sinchronizacijai:

```typescript
async function syncToGoogleCalendar(bookingId: string, action: 'create' | 'update' | 'delete'): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !serviceRoleKey) return;
  
  await fetch(`${supabaseUrl}/functions/v1/sync-google-calendar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`
    },
    body: JSON.stringify({ bookingId, action })
  }).catch(err => console.error('Google sync error:', err));
}
```

---

## Veikimo schema

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SINCHRONIZACIJOS SRAUTAS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LOVABLE → GOOGLE                       GOOGLE → LOVABLE                    │
│  ──────────────────                     ──────────────────                  │
│                                                                             │
│  1. Klientas rezervuoja                 1. import-google-calendar           │
│     ↓                                      ↓                                │
│  2. sync-google-calendar               2. Randa įrašus be STS               │
│     ↓                                      ↓                                │
│  3. Sukuria "STS Jonas - Masažas"      3. Atnaujina į "STS ..."            │
│                                            ↓                                │
│  4. Sistema sukuria rezervaciją        4. Importuoja išorinius įrašus      │
│     ↓                                                                       │
│  5. sync-google-calendar                                                    │
│     ↓                                                                       │
│  6. Sukuria "STS Užimta"                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Rezultatas

| Google Calendar įrašas | Prieš | Po |
|------------------------|-------|-----|
| Sistema rezervacija | `[SISTEMA] Užimta` | `STS Užimta` |
| Kliento rezervacija | `Jonas - Masažas` | `STS Jonas - Masažas` |
| Senas įrašas be prefikso | `Petras - Kirpimas` | `STS Petras - Kirpimas` |
| Išorinis įrašas | `Meeting with client` | Lieka nepakeistas (importuojamas kaip sistema) |

---

## Failų sąrašas

| Failas | Veiksmas |
|--------|----------|
| `supabase/functions/sync-google-calendar/index.ts` | Pakeisti summary formatą su STS |
| `supabase/functions/import-google-calendar/index.ts` | Pridėti senų įrašų pataisymą + pakeisti filtrą |
| `supabase/functions/system-bookings/index.ts` | Pridėti sinchronizaciją po rezervacijos sukūrimo |

---

## Įgyvendinimo eiliškumas

1. Atnaujinti `sync-google-calendar` su STS formatu
2. Atnaujinti `import-google-calendar` su senų įrašų pataisymu
3. Atnaujinti `system-bookings` su Google Calendar sinchronizacija
4. Paleisti deployment visoms funkcijoms
5. Testuoti - patikrinti ar seni įrašai atsinaujina su STS
