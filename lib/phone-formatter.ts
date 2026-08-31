/**
 * Formats a raw or partial phone number string into the standard Argentine format.
 * Currently delegates parsing and formatting to the backend (E.164).
 */
export function formatPhoneWhatsapp(input: string | undefined | null): string {
  if (!input) return '';
  return input;
}
