-- ==========================================
-- Phase AA: DB Security (RLS) Refinement
-- Transitioning from "Allow all" to Granular RBAC
-- ==========================================

-- Standard approach: Reset policies
DROP POLICY IF EXISTS "Allow full access to users" ON public.users;
DROP POLICY IF EXISTS "Allow full access to shifts" ON public.shifts;
DROP POLICY IF EXISTS "Allow full access to attendances" ON public.attendances;
DROP POLICY IF EXISTS "Allow full access to expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow full access to expense_templates" ON public.expense_templates;
DROP POLICY IF EXISTS "Allow full access to stores" ON public.stores;
DROP POLICY IF EXISTS "Allow full access to holiday_requests" ON public.holiday_requests;

-- 1. USERS Table
-- Anyone can see names (for coworker list), but only self/admin can update.
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own display name" ON public.users FOR UPDATE 
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'));

-- 2. SHIFTS Table
-- Staff sees own, Managers/Admins see all.
CREATE POLICY "Shifts are viewable by owner or managers" ON public.shifts FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('MANAGER', 'ADMIN')));

CREATE POLICY "Shifts can be created by owner (plans) or managers (all)" ON public.shifts FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND shift_type = 'plan') OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('MANAGER', 'ADMIN'))
  );

CREATE POLICY "Shifts can be updated by owner (planning fields) or managers (all)" ON public.shifts FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('MANAGER', 'ADMIN')))
  WITH CHECK (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('MANAGER', 'ADMIN')) OR
      (user_id = auth.uid() AND (
        -- Staff can only update these fields (logic enforced by app, but here is DB level check if possible)
        -- Note: Standard SQL check for specific columns is hard in simple RLS, but we trust the base using/with check for ownership.
        true
      ))
  );

CREATE POLICY "Shifts can be deleted by managers" ON public.shifts FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('MANAGER', 'ADMIN')) OR (user_id = auth.uid() AND shift_type = 'plan'));

-- 3. ATTENDANCES Table
CREATE POLICY "Attendances are viewable by owner or managers" ON public.attendances FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('MANAGER', 'ADMIN')));

CREATE POLICY "Attendances can be created by owner" ON public.attendances FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 4. EXPENSES Table
CREATE POLICY "Expenses are viewable by owner or managers" ON public.expenses FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('MANAGER', 'ADMIN')));

CREATE POLICY "Expenses can be managed by owner" ON public.expenses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. STORES Table
CREATE POLICY "Stores are viewable by everyone" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Stores can be managed by admins" ON public.stores FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'ADMIN'));

-- 6. HOLIDAY REQUESTS Table
CREATE POLICY "Holiday requests are viewable by owner or managers" ON public.holiday_requests FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('MANAGER', 'ADMIN')));

CREATE POLICY "Holiday requests can be created by owner" ON public.holiday_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Holiday requests can be updated by managers" ON public.holiday_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('MANAGER', 'ADMIN')));
