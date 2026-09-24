DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'proposal_status') THEN
    CREATE TYPE proposal_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES persons(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS person_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  proposed_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changes jsonb NOT NULL,
  status proposal_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS person_proposals_family_idx ON person_proposals(family_id);
CREATE INDEX IF NOT EXISTS person_proposals_person_idx ON person_proposals(person_id);
CREATE INDEX IF NOT EXISTS person_proposals_status_idx ON person_proposals(status);
