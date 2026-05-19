-- Append "Cancelled" to statuses array of every project that doesn't already have it.
UPDATE projects
SET statuses = json_insert(statuses, '$[#]', 'Cancelled')
WHERE NOT EXISTS (
  SELECT 1 FROM json_each(projects.statuses) WHERE value = 'Cancelled'
);
