/**
 * Formats a raw or partial phone number string into the standard Argentine format:
 * +54 X XX XXXX-XXXX
 * 
 * Example:
 * input: "5491138441920" -> "+54 9 11 3844-1920"
 * input: "92477621105"   -> "+54 9 24 7762-1105"
 */
export function formatPhoneWhatsapp(input: string | undefined | null): string {
  if (!input) return '';
  
  // Extract all numeric digits
  let digits = input.replace(/\D/g, '');
  if (!digits) return '';

  // If input doesn't start with country code '54', prepend it
  if (!digits.startsWith('54')) {
    digits = '54' + digits;
  }

  // Cap at 13 digits (+54 + 1 digit + 2 digits + 4 digits + 4 digits)
  digits = digits.slice(0, 13);

  let formatted = '+54';
  const rest = digits.slice(2); // digits after 54

  if (rest.length > 0) {
    formatted += ' ' + rest.slice(0, 1);
  }
  if (rest.length > 1) {
    formatted += ' ' + rest.slice(1, 3);
  }
  if (rest.length > 3) {
    formatted += ' ' + rest.slice(3, 7);
  }
  if (rest.length > 7) {
    formatted += '-' + rest.slice(7, 11);
  }

  return formatted;
}
