

# Logotipo pridėjimas į rezervacijos valdymo puslapį

## Apžvalga

Pridėsime "SAU TIK SAU" masažo studijos logotipą į rezervacijos valdymo puslapio viršų (`/booking/:token`), kad klientai matytų profesionalų brendingą.

---

## Vizualinis rezultatas

Logotipas bus rodomas:
- Puslapio viršuje, centruotas
- Prieš "Grįžti" mygtuką
- Paspaudus ant logotipo - nukreips į pagrindinį puslapį

---

## Techniniai pakeitimai

### Failas: `src/pages/ManageBooking.tsx`

1. **Pridėti logotipo importą** (2 eilutė):
   ```typescript
   import logo from "@/assets/logo.png";
   ```

2. **Pridėti logotipą į puslapio struktūrą** (virš "Grįžti" mygtuko):
   ```tsx
   {/* Logo */}
   <div className="flex justify-center mb-6">
     <a href="/">
       <img 
         src={logo} 
         alt="SAU TIK SAU masažo studija" 
         className="w-32 md:w-40"
       />
     </a>
   </div>
   ```

---

## Pakeitimai klaidos būsenoje

Taip pat pridėsime logotipą į klaidos rodinį (kai rezervacija nerasta), kad visais atvejais būtų matomas brendingas.

