-- ============================================================
-- CribLedger Migration 007 — Seed Data (Development Only)
-- DO NOT run this in production.
-- ============================================================

INSERT INTO users (id, display_name, role, avatar_color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Joey',  'admin',  '#f5b832'),
  ('00000000-0000-0000-0000-000000000002', 'Mark',  'player', '#60a5fa'),
  ('00000000-0000-0000-0000-000000000003', 'Dave',  'player', '#a78bfa'),
  ('00000000-0000-0000-0000-000000000004', 'Chris', 'player', '#34d399'),
  ('00000000-0000-0000-0000-000000000005', 'Lena',  'player', '#f472b6'),
  ('00000000-0000-0000-0000-000000000006', 'Zach',  'player', '#fb923c')
ON CONFLICT (id) DO NOTHING;
