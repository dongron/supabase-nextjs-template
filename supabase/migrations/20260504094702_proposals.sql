-- Create proposals table for the CEO proposal pipeline queue

CREATE TABLE "public"."proposals" (
    "id"                    uuid            NOT NULL DEFAULT gen_random_uuid(),
    "created_at"            timestamptz     NOT NULL DEFAULT now(),
    "customer_name"         text            NOT NULL,
    "neighborhood"          text            NOT NULL,
    "walk_date"             date,
    "estimated_value"       numeric(12,2)   NOT NULL DEFAULT 0
                                            CHECK (estimated_value >= 0),
    "stage"                 text            NOT NULL DEFAULT 'voice_memo_received'
                                            CHECK (stage IN (
                                              'lead_received',
                                              'voice_memo_received',
                                              'processing',
                                              'ready_for_review',
                                              'sent',
                                              'signed'
                                            )),
    "stage_entered_at"      timestamptz     NOT NULL DEFAULT now(),
    "render_required"       boolean         GENERATED ALWAYS AS (estimated_value > 30000) STORED,
    "designer_notified"     boolean         NOT NULL DEFAULT false,
    "designer_notified_at"  timestamptz,
    "designer_eta"          timestamptz,
    "render_delivered"      boolean         NOT NULL DEFAULT false,
    "needs_attention"       boolean         NOT NULL DEFAULT false,
    "owner"                 uuid            NOT NULL,
    "archived_at"           timestamptz
);

ALTER TABLE "public"."proposals"
    ADD CONSTRAINT "proposals_pkey" PRIMARY KEY ("id");

ALTER TABLE "public"."proposals"
    ADD CONSTRAINT "proposals_owner_fkey"
    FOREIGN KEY ("owner") REFERENCES auth.users(id)
    ON UPDATE CASCADE ON DELETE CASCADE;

CREATE INDEX proposals_owner_stage_idx ON public.proposals (owner, stage);
CREATE INDEX proposals_stage_entered_at_idx ON public.proposals (stage_entered_at);

ALTER TABLE "public"."proposals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select_own"
    ON public.proposals FOR SELECT TO authenticated
    USING (auth.uid() = owner);

CREATE POLICY "proposals_insert_own"
    ON public.proposals FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner);

CREATE POLICY "proposals_update_own"
    ON public.proposals FOR UPDATE TO authenticated
    USING (auth.uid() = owner)
    WITH CHECK (auth.uid() = owner);
