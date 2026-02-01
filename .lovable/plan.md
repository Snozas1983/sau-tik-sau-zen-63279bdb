

# Planas: Formos laukelių atnaujinimas

## Pakeitimai

### 1. Pašalinti "(neprivaloma)" žodį
Nereikia rodyti šio teksto prie neprivalomų laukelių - tiesiog pašalinti.

### 2. Išvalyti placeholder tekstus
- **Vardas ir pavardė**: pašalinti "Jonas Jonaitis" → tuščias
- **Telefonas**: palikti tik "+370" kaip pradinę reikšmę (ne placeholder, o value)
- **El. paštas**: pašalinti "jonas@example.com" → tuščias
- **Nuolaidos kodas**: pašalinti "NUOLAIDA10" → tuščias

### 3. Telefono numerio validacija tik +370
- Telefono laukelis pradedamas su "+370" (naudotojas negali ištrinti)
- Tikrinama, kad numeris prasideda "+370" ir turi teisingą formatą
- Klaidos pranešimas jei bandoma įvesti kitą kodą

### 4. El. pašto validacija
- Tikrinama ar yra "@" simbolis (jau veikia, bet patikrinti)

## Failų pakeitimai

| Failas | Pakeitimas |
|--------|------------|
| `src/components/booking/BookingForm.tsx` | Visi aukščiau aprašyti pakeitimai |

## Techninis planas

### A. Telefono laukelis su +370 prefiksu

```typescript
// Pradinė reikšmė su +370
const [formData, setFormData] = useState<CustomerFormData>({
  fullName: '',
  phone: '+370 ',  // Pradedame su kodu
  email: '',
  promoCode: '',
});

// Validacija - tikrinti +370 formatą
if (!formData.phone.trim() || formData.phone.trim() === '+370') {
  newErrors.phone = 'Prašome įvesti telefono numerį';
} else if (!/^\+370\s?\d{3}\s?\d{5}$/.test(formData.phone.replace(/\s/g, ''))) {
  newErrors.phone = 'Įveskite Lietuvos telefono numerį (+370...)';
}

// Neleisti ištrinti +370 prefikso
const handlePhoneChange = (value: string) => {
  if (!value.startsWith('+370')) {
    value = '+370 ' + value.replace(/^\+?370?\s?/, '');
  }
  handleChange('phone', value);
};
```

### B. Pašalinti "(neprivaloma)" tekstą

```tsx
// Buvo:
El. paštas <span className="text-booking-muted/50">(neprivaloma)</span>

// Bus:
El. paštas
```

### C. Išvalyti placeholder tekstus

```tsx
// Vardas - tuščias placeholder
placeholder=""

// El. paštas - tuščias placeholder  
placeholder=""

// Nuolaidos kodas - tuščias placeholder
placeholder=""

// Telefono laukelis - nėra placeholder, nes value jau turi +370
```

### D. Pašalinti papildomą nuolaidos kodo paaiškinimą

```tsx
// Pašalinti šią eilutę:
<p className="text-xs text-booking-muted/60">
  Jei turite nuolaidos kodą, įveskite jį čia
</p>
```

## Vizualinis rezultatas

**Prieš:**
- Vardas ir pavardė * `[Jonas Jonaitis]`
- Telefonas * `[+370 600 00000]`
- El. paštas (neprivaloma) `[jonas@example.com]`
- Nuolaidos kodas (neprivaloma) `[NUOLAIDA10]`

**Po:**
- Vardas ir pavardė * `[                    ]`
- Telefonas * `[+370 ]` ← jau įvestas kodas
- El. paštas `[                    ]`
- Nuolaidos kodas `[                    ]`

