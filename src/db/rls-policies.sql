-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY POLICIES FOR GÉNÉAPRO
-- Multi-Tenant Isolation via family_id
-- ═══════════════════════════════════════════════

-- Enable RLS on all tenant-scoped tables
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════
-- PERSONS: Users can only see persons in their families
-- ═══════════════════════════════════════════════

CREATE POLICY "persons_select_family_member" ON persons
  FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

CREATE POLICY "persons_insert_family_member" ON persons
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
      AND fm.role IN ('admin', 'editor', 'contributor')
    )
  );

CREATE POLICY "persons_update_family_member" ON persons
  FOR UPDATE
  USING (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
      AND fm.role IN ('admin', 'editor', 'contributor')
    )
  );

CREATE POLICY "persons_delete_family_admin" ON persons
  FOR DELETE
  USING (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
      AND fm.role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════
-- RELATIONSHIPS: Same isolation as persons
-- ═══════════════════════════════════════════════

CREATE POLICY "relationships_select_family" ON relationships
  FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

CREATE POLICY "relationships_insert_family" ON relationships
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
      AND fm.role IN ('admin', 'editor', 'contributor')
    )
  );

CREATE POLICY "relationships_delete_family" ON relationships
  FOR DELETE
  USING (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
      AND fm.role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════
-- MEDIA: Same isolation pattern
-- ═══════════════════════════════════════════════

CREATE POLICY "media_select_family" ON media
  FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

CREATE POLICY "media_insert_family" ON media
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
      AND fm.role IN ('admin', 'editor', 'contributor')
    )
  );

CREATE POLICY "media_delete_family" ON media
  FOR DELETE
  USING (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
      AND fm.role IN ('admin', 'editor')
    )
  );

-- ═══════════════════════════════════════════════
-- INVITATIONS: Visible to family members
-- ═══════════════════════════════════════════════

CREATE POLICY "invitations_select_family" ON invitations
  FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

CREATE POLICY "invitations_insert_family" ON invitations
  FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
      AND fm.role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════
-- SUBSCRIPTIONS & PAYMENTS: Visible to family admins
-- ═══════════════════════════════════════════════

CREATE POLICY "subscriptions_select_family" ON subscriptions
  FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

CREATE POLICY "payments_select_family" ON payments
  FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- ═══════════════════════════════════════════════
-- FAMILY_MEMBERS: Visible within the same family
-- ═══════════════════════════════════════════════

CREATE POLICY "family_members_select_family" ON family_members
  FOR SELECT
  USING (
    family_id IN (
      SELECT fm2.family_id
      FROM family_members fm2
      WHERE fm2.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- ═══════════════════════════════════════════════
-- AUDIT LOGS: Visible to family admins
-- ═══════════════════════════════════════════════

CREATE POLICY "audit_logs_select_family" ON audit_logs
  FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id
      FROM family_members fm
      WHERE fm.user_id = current_setting('app.current_user_id', true)::uuid
      AND fm.role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════
-- SUPER_ADMIN BYPASS POLICIES
-- Super admins can see all data regardless of family
-- (Application layer checks system_role = 'super_admin')
-- ═══════════════════════════════════════════════
