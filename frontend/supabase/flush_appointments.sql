-- ============================================================
-- CuraTrack SQL Migration & Database Flush Script
-- Run this script in your Supabase SQL Editor to clear all appointments
-- ============================================================

-- 1. Truncate / Delete all appointments
DELETE FROM public.appointments;

-- 2. Add DELETE policy so participants can clear their appointments via API if needed
DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;
CREATE POLICY "Users can delete their own appointments"
ON public.appointments FOR DELETE
USING (auth.uid() = client_id OR auth.uid() = doctor_id);

-- 3. Ensure full permissions are granted
GRANT ALL ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO anon;
