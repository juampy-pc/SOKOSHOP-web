export function cleanProductName(name: string, brandName: string): string {
  const prefix = brandName.trim();
  if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
    return name.slice(prefix.length).trim();
  }
  return name;
}
