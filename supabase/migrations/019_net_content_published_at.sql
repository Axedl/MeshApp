-- Add published_at to mesh_net_content so GMs can control the displayed date
-- independently of when the record was actually created.
ALTER TABLE mesh_net_content
  ADD COLUMN published_at timestamptz NOT NULL DEFAULT NOW();
