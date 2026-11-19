-- Organizer decision (19 Nov 2026): Senior category is 45 years or older on the event date.
UPDATE categories SET min_age = 45, updated_at = now() WHERE code = 'senior';
