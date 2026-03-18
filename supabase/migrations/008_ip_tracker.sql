-- Add Improvement Point (IP) tracking to PC sheets
ALTER TABLE mesh_pc_sheets
  ADD COLUMN IF NOT EXISTS ip_total   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ip_spent   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ip_log     jsonb   NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN mesh_pc_sheets.ip_total  IS 'Total IP ever awarded to this character';
COMMENT ON COLUMN mesh_pc_sheets.ip_spent  IS 'IP spent on skills/stats';
COMMENT ON COLUMN mesh_pc_sheets.ip_log    IS 'Array of {amount, source, awarded_at} entries';
