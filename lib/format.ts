export function cleanProductName(name: string, brandName: string): string {
  const prefix = brandName.trim();
  if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
    return name.slice(prefix.length).trim();
  }
  return name;
}

/** Nombre corto para listas compactas: sin marca, concentración ni tamaño ("9PM Eau de Parfum 100 ml" → "9PM"). */
export function shortProductName(name: string, brandName: string): string {
  const s = cleanProductName(name, brandName)
    .replace(/\b(eau de parfum( intense)?|eau de toilette|extrait de parfum|edp|edt)\b/gi, "")
    .replace(/\d+(?:[.,]\d+)?\s?ml\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return s || cleanProductName(name, brandName);
}
