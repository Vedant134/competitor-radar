-- Demo entity schema for the data-app template.
-- Replace or extend these migrations with the real app's schema before shipping.
-- Convention: numbered files under db/migrations/ apply automatically in name
-- order, each exactly once per database — git push applies pending files to the
-- draft's preview database before the build, and publish applies them to
-- production before the release. Applied files are immutable (enforced by a
-- checksum guard): never edit one, add a new numbered file instead.

CREATE TABLE app_opportunities (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  title VARCHAR(255) NOT NULL,
  stage VARCHAR(32) NOT NULL DEFAULT 'qualified',
  priority VARCHAR(16) NOT NULL DEFAULT 'p2',
  owner JSON NULL,
  region VARCHAR(16) NOT NULL DEFAULT 'na',
  amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
  confidence DECIMAL(5, 2) NOT NULL DEFAULT 0,
  close_date DATE NULL,
  enterprise BOOLEAN NOT NULL DEFAULT FALSE,
  source_url VARCHAR(2048) NULL,
  contact_email VARCHAR(255) NULL,
  attachments JSON NULL,
  customer JSON NULL
);
