-- Organizer decision (19 Nov 2026), matching the published poster:
--   Masters (code 'senior'), 5 KM: 40 years or older on the event date.
--   General, 10 KM: 15 years or older on the event date; prizes split 15–34 / 35+ (see AGE_GROUPS in src/domain.js).
UPDATE categories SET min_age = 40, name_lo = 'ລຸ້ນ Masters', updated_at = now() WHERE code = 'senior';
UPDATE categories SET min_age = 15, updated_at = now() WHERE code = 'general';
