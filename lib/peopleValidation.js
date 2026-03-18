export const VALID_SALUTATIONS = ['Mr.', 'Ms.', 'Mx.', 'Prof.', 'Doc.', 'Amb.'];
export const VALID_ROOM_TYPES = ['single', 'double'];

/**
 * Validate a person record. Works in both browser and Node.js.
 * @param {object} person - The person data to validate
 * @param {object} options - Optional: { accommodationStartDate, accommodationEndDate }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePerson(person, { accommodationStartDate, accommodationEndDate } = {}) {
  const errors = [];

  if (!person.person_id || String(person.person_id).trim() === '') {
    errors.push('person_id is required');
  }
  if (!person.first_name || String(person.first_name).trim() === '') {
    errors.push('first_name is required');
  }
  if (!person.last_name || String(person.last_name).trim() === '') {
    errors.push('last_name is required');
  }
  if (!person.email || !String(person.email).includes('@')) {
    errors.push('Valid email is required (must contain @)');
  }
  if (person.mobile_phone && !/^[\d\s+\-()]+$/.test(String(person.mobile_phone))) {
    errors.push('mobile_phone contains invalid characters (only digits, spaces, +, -, () allowed)');
  }
  if (person.salutation && !VALID_SALUTATIONS.includes(person.salutation)) {
    errors.push(`salutation must be one of: ${VALID_SALUTATIONS.join(', ')}`);
  }
  if (person.room_type && !VALID_ROOM_TYPES.includes(String(person.room_type).toLowerCase())) {
    errors.push('room_type must be "single" or "double"');
  }

  const checkin = person.checkin_date ? String(person.checkin_date) : '';
  const checkout = person.checkout_date ? String(person.checkout_date) : '';

  if (checkin && checkout && checkout <= checkin) {
    errors.push('checkout_date must be after checkin_date');
  }
  if (accommodationStartDate && accommodationEndDate) {
    if (checkin && (checkin < accommodationStartDate || checkin > accommodationEndDate)) {
      errors.push(`checkin_date must be within accommodation period (${accommodationStartDate} to ${accommodationEndDate})`);
    }
    if (checkout && (checkout < accommodationStartDate || checkout > accommodationEndDate)) {
      errors.push(`checkout_date must be within accommodation period (${accommodationStartDate} to ${accommodationEndDate})`);
    }
  }

  return { valid: errors.length === 0, errors };
}
