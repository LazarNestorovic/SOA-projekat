export function formatDate(value) {
  if (!value) return 'n/a';
  return new Date(value).toLocaleString();
}
