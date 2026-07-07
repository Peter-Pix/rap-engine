/**
 * Výpočet věku a let pro entity karty.
 */

/**
 * Vypočítá věk z data narození.
 * Vrací null pokud birthDate chybí nebo je neplatné.
 */
export function calculateAge(birthDate: string | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

/**
 * Formátuje věk do čitelného řetězce.
 * Např. "28 let" nebo "1 rok" nebo "2 roky"
 */
export function formatAge(age: number): string {
  if (age === 1) return "1 rok";
  if (age >= 2 && age <= 4) return `${age} roky`;
  return `${age} let`;
}

/**
 * Vypočítá, kolik let uběhlo od roku vydání alba.
 */
export function calculateAlbumYears(year: number | undefined): number | null {
  if (!year || typeof year !== "number") return null;
  const currentYear = new Date().getFullYear();
  const years = currentYear - year;
  return years >= 0 ? years : null;
}

/**
 * Formátuje roky alba do čitelného řetězce.
 */
export function formatAlbumYears(years: number): string {
  if (years === 0) return "Letos";
  if (years === 1) return "1 rok";
  if (years >= 2 && years <= 4) return `${years} roky`;
  return `${years} let`;
}
