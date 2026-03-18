-- ============================================================
-- Migration: Add accommodation_funding_type to people table
-- ============================================================

ALTER TABLE people ADD COLUMN IF NOT EXISTS accommodation_funding_type VARCHAR(20)
  DEFAULT 'forum_covered'
  CHECK (accommodation_funding_type IN ('self_funded', 'forum_covered'));
