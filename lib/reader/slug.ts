export function slugFromFilename(name: string) {
  return name
    .replace(/\.epub$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isSlugMatchFilename(slug: string, name: string) {
  return slugFromFilename(name) === slug;
}
