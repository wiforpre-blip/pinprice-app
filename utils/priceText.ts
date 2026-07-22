export function formatPriceText(text: string) {
  const digits = text.replace(/\D/g, '');

  if (!digits) {
    return text;
  }

  return `THB ${Number(digits).toLocaleString('en-US')}`;
}
