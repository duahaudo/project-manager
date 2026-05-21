ALTER TABLE projects ADD COLUMN rank TEXT NOT NULL DEFAULT '';

UPDATE projects
SET rank = printf('%010d', (
  SELECT rn FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn FROM projects
  ) sub
  WHERE sub.id = projects.id
));
