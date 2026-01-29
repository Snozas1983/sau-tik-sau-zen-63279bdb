
# Planas: Kelių dienų/savaičių kalendoriaus išjungimas

## Problema
Dabartinė sistema leidžia kurti išimtis tik:
1. Vienai konkrečiai dienai (su `date` lauku)
2. Kartotinai savaitės dienai (su `day_of_week` ir `is_recurring`)

Vartotojas nori galimybės užblokuoti **datų intervalą** (nuo-iki), pavyzdžiui atostogoms ar remontui, vienu įrašu uždarant visas dienas tame periode.

## Sprendimas
Pridėti naują `end_date` lauką į `schedule_exceptions` lentelę ir atnaujinti logiką, kad palaikytų datų intervalus.

## Duomenų bazės pakeitimai

### Nauja migracija
```sql
ALTER TABLE schedule_exceptions 
ADD COLUMN end_date date NULL;

COMMENT ON COLUMN schedule_exceptions.end_date IS 
'Pabaigos data intervalui. Jei nustatyta kartu su date, blokuoja visas dienas nuo date iki end_date.';
```

**Duomenų struktūra po pakeitimo:**
| Scenarijus | date | end_date | day_of_week | is_recurring |
|------------|------|----------|-------------|--------------|
| Viena diena | 2026-02-01 | NULL | NULL | false |
| Intervalas (atostogos) | 2026-02-01 | 2026-02-14 | NULL | false |
| Kartotinė (kiekv. pirmadienis) | NULL | NULL | 1 | true |

## Backend pakeitimai

### `airtable-proxy/index.ts`
1. **POST/PUT endpoints**: Priimti naują `end_date` lauką
2. **Availability logika**: Atnaujinti `isSlotBlockedByException` funkciją:

```text
// Esama logika:
blockExceptionsByDate.get(dateStr) // tikrina tik vieną datą

// Nauja logika:
for (const ex of exceptionsData) {
  if (ex.date && ex.end_date) {
    // Intervalas: tikrinti ar dateStr yra tarp date ir end_date
    if (dateStr >= ex.date && dateStr <= ex.end_date) {
      // Blokuoti visą dieną arba konkretų laiką
    }
  } else if (ex.date) {
    // Esama logika vienai dienai
  }
}
```

## Frontend pakeitimai

### Naujas komponentas: `DateRangeExceptionDialog.tsx`
Skirtas kurti kelių dienų išimtis iš Nustatymų (Settings):

```text
+------------------------------------------+
| Kalendoriaus išjungimas                   |
|                                           |
| Pradžia: [📅 2026-02-01]                  |
| Pabaiga:  [📅 2026-02-14]                 |
|                                           |
| [x] Visa diena                            |
| [ ] Konkretus laikas: 09:00 - 18:00       |
|                                           |
| Aprašymas: [Atostogos________________]    |
|                                           |
| [Atšaukti]              [Išsaugoti]       |
+------------------------------------------+
```

### `SettingsTab.tsx` pakeitimai
Pridėti naują sekciją "Kalendoriaus išjungimai":

```text
+------------------------------------------+
| Kalendoriaus išjungimai                   |
| Blokuoti registraciją tam tikram laikotarpiui |
|                                           |
| [ + Pridėti naują ]                       |
|                                           |
| ┌────────────────────────────────────────┐ |
| │ 📅 2026-02-01 — 2026-02-14             │ |
| │ Atostogos (visa diena)                 │ |
| │                              [🗑️ Trinti]│ |
| └────────────────────────────────────────┘ |
|                                           |
| ┌────────────────────────────────────────┐ |
| │ 📅 2026-03-10 — 2026-03-10             │ |
| │ Pietų pertrauka (12:00-14:00)          │ |
| │                              [🗑️ Trinti]│ |
| └────────────────────────────────────────┘ |
+------------------------------------------+
```

### `ExceptionDialog.tsx` pakeitimai
Palikti esamą funkcionalumą kalendoriaus dienų view (vienos dienos išimtys), bet pridėti galimybę pasirinkti "iki" datą:

- Pridėti checkbox "Kelios dienos"
- Kai pažymėta, rodyti papildomą "Pabaigos data" lauką

## Failų pakeitimai

| Failas | Veiksmas |
|--------|----------|
| `supabase/migrations/xxx_add_end_date_to_exceptions.sql` | Sukurti |
| `supabase/functions/airtable-proxy/index.ts` | Atnaujinti availability logiką ir CRUD endpoints |
| `src/components/admin/SettingsTab.tsx` | Pridėti "Kalendoriaus išjungimai" sekciją |
| `src/components/admin/DateRangeExceptionDialog.tsx` | Sukurti naują komponentą |
| `src/components/admin/ExceptionDialog.tsx` | Pridėti "iki datos" pasirinkimą |
| `src/hooks/useScheduleExceptions.ts` | Pridėti `end_date` į tipą |

## Veiksmų seka

1. **Migracija**: Pridėti `end_date` stulpelį į `schedule_exceptions`
2. **Backend**: Atnaujinti `airtable-proxy` - CRUD ir availability logika
3. **Hook**: Atnaujinti `useScheduleExceptions` tipą
4. **UI Settings**: Pridėti naują sekciją su sąrašu ir kūrimo mygtuku
5. **Dialog**: Sukurti `DateRangeExceptionDialog` komponentą
6. **Existing Dialog**: Atnaujinti `ExceptionDialog` palaikyti kelias dienas

## Rezultatas
Po įgyvendinimo:
- Admin nustatymuose bus nauja sekcija "Kalendoriaus išjungimai"
- Galima sukurti intervalą nuo-iki vienu įrašu
- Galima pasirinkti ar blokuoti visą dieną ar tik tam tikras valandas
- Visos dienos intervale bus automatiškai užblokuotos
- Esamame kalendoriaus view galima pridėti kelių dienų išimtį

## Techniniai detaliai

### Availability logikos pseudokodas
```text
function isDateBlocked(dateStr):
  for each exception in rangeExceptions:
    if dateStr >= exception.date AND dateStr <= exception.end_date:
      if exception.start_time == '00:00' AND exception.end_time == '23:59':
        return FULL_DAY_BLOCKED
      else:
        return PARTIAL_BLOCK(exception.start_time, exception.end_time)
  return NOT_BLOCKED
```

### UI tipas
```typescript
interface ScheduleException {
  id: string;
  date: string | null;
  end_date: string | null;  // NAUJAS
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  exception_type: 'block' | 'allow';
  is_recurring: boolean;
  description: string | null;
  created_at: string;
}
```
