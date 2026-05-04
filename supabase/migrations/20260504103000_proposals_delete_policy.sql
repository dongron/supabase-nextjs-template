-- Allow proposal owners to delete their own proposals

CREATE POLICY "delete_own" ON public.proposals
  FOR DELETE
  TO authenticated
  USING (owner = auth.uid());
