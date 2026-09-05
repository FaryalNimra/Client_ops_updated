-- ============================================================
-- Client Ops — Supabase Schema v0.2
-- Run in Supabase SQL Editor (dashboard > SQL Editor > New query)
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- fuzzy search on client names

-- ── ENUM types ───────────────────────────────────────────────
create type user_role        as enum ('super_admin', 'admin', 'client');
create type client_status    as enum ('lead', 'onboarding', 'active', 'past_due', 'paused', 'churned');
create type asset_type       as enum ('domain', 'registrar', 'dns', 'github_repo', 'google_account', 'hosting', 'analytics', 'email', 'other');
create type invoice_status   as enum ('draft', 'open', 'paid', 'uncollectible', 'void');
create type request_type     as enum ('contact_info', 'copy_edit', 'image_swap', 'link_fix', 'other');
create type request_status   as enum ('new', 'in_progress', 'needs_client_input', 'done', 'rejected');
create type sub_status       as enum ('active', 'past_due', 'canceled', 'trialing', 'paused', 'incomplete', 'incomplete_expired', 'unpaid');

-- ── organizations ────────────────────────────────────────────
create table organizations (
  id                    uuid primary key default uuid_generate_v4(),
  name                  text not null,
  slug                  text not null unique,
  default_price_cents   integer not null default 3000,
  default_currency      text not null default 'EUR', -- ISO 4217
  suspended             boolean not null default false,
  created_by            uuid references auth.users(id),
  created_at            timestamptz not null default now()
);

-- ── profiles ─────────────────────────────────────────────────
-- id mirrors auth.users.id
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  role        user_role not null default 'client',
  org_id      uuid references organizations(id),   -- null for super_admin
  client_id   uuid,                                 -- set after clients row created
  created_at  timestamptz not null default now()
);

-- ── clients ──────────────────────────────────────────────────
create table clients (
  id                  uuid primary key default uuid_generate_v4(),
  org_id              uuid not null references organizations(id),
  business_name       text not null,
  contact_name        text,
  email               text not null,
  phone               text,
  country             text,
  vat_id              text,
  status              client_status not null default 'lead',
  stripe_customer_id  text unique,
  stripe_subscription_id text unique,
  purchase_date       date,                          -- billing anchor from Stripe
  plan_price_cents    integer,
  currency            text default 'EUR',
  setup_fee_cents     integer default 0,
  churn_reason        text,
  notes               text,
  created_at          timestamptz not null default now()
);

-- back-fill the FK now that clients exists
alter table profiles add constraint profiles_client_id_fkey
  foreign key (client_id) references clients(id);

-- ── client_assets ─────────────────────────────────────────────
create table client_assets (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references clients(id) on delete cascade,
  org_id      uuid not null references organizations(id),
  type        asset_type not null,
  label       text not null,
  value       text,
  url         text,
  vault_ref   text,       -- pointer to 1Password / Bitwarden item (never the secret)
  expires_at  date,       -- domain/SSL expiry
  notes       text,
  created_at  timestamptz not null default now()
);

-- ── subscriptions (Stripe mirror) ────────────────────────────
create table subscriptions (
  stripe_subscription_id  text primary key,
  client_id               uuid not null references clients(id),
  org_id                  uuid not null references organizations(id),
  status                  sub_status not null,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean not null default false,
  latest_invoice_id       text,
  updated_at              timestamptz not null default now()
);

-- ── invoices (Stripe mirror) ─────────────────────────────────
create table invoices (
  stripe_invoice_id   text primary key,
  client_id           uuid not null references clients(id),
  org_id              uuid not null references organizations(id),
  amount_cents        integer not null,
  currency            text not null,
  status              invoice_status not null,
  due_date            timestamptz,
  paid_at             timestamptz,
  attempt_count       integer not null default 0,
  hosted_invoice_url  text,
  invoice_pdf         text,
  billing_month       text,   -- 'YYYY-MM' for quota grouping
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── change_requests ──────────────────────────────────────────
create table change_requests (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid not null references clients(id),
  org_id          uuid not null references organizations(id),
  submitted_by    uuid references auth.users(id),
  type            request_type not null,
  description     text not null,
  target_page     text,
  status          request_status not null default 'new',
  admin_note      text,
  billing_month   text not null,  -- 'YYYY-MM'
  attachment_url  text,           -- image_swap only, stored in Supabase storage
  requested_at    timestamptz not null default now(),
  completed_at    timestamptz
);

-- ── webhook_events (idempotency) ─────────────────────────────
create table webhook_events (
  stripe_event_id text primary key,
  type            text not null,
  received_at     timestamptz not null default now(),
  processed_at    timestamptz
);

-- ── activity_log ─────────────────────────────────────────────
create table activity_log (
  id          bigint generated always as identity primary key,
  org_id      uuid references organizations(id),
  client_id   uuid references clients(id),
  actor       uuid references auth.users(id),
  action      text not null,
  payload     jsonb,
  created_at  timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────
create index idx_clients_org         on clients(org_id);
create index idx_clients_status      on clients(status);
create index idx_clients_stripe_cid  on clients(stripe_customer_id);
create index idx_invoices_client     on invoices(client_id);
create index idx_invoices_org        on invoices(org_id);
create index idx_invoices_status     on invoices(status);
create index idx_change_requests_client  on change_requests(client_id);
create index idx_change_requests_org     on change_requests(org_id);
create index idx_change_requests_month   on change_requests(billing_month);
create index idx_activity_log_client on activity_log(client_id);
create index idx_activity_log_org    on activity_log(org_id);
create index idx_client_assets_client on client_assets(client_id);
-- GIN index for fuzzy name search
create index idx_clients_name_trgm on clients using gin (business_name gin_trgm_ops);

-- ── Views ────────────────────────────────────────────────────
create or replace view client_lifetime_value as
  select
    client_id,
    org_id,
    coalesce(sum(amount_cents) filter (where status = 'paid'), 0) as total_paid_cents,
    coalesce(sum(amount_cents) filter (where status = 'paid'), 0)::float / 100 as total_paid,
    max(paid_at) as last_paid_at
  from invoices
  group by client_id, org_id;

create or replace view org_mrr as
  select
    c.org_id,
    count(*) filter (where c.status = 'active')  as active_clients,
    coalesce(sum(c.plan_price_cents) filter (where c.status = 'active'), 0) as mrr_cents
  from clients c
  group by c.org_id;

-- ── Trigger: auto activity_log on client status change ───────
create or replace function log_client_status_change()
returns trigger language plpgsql security definer as $$
begin
  if (new.status is distinct from old.status) then
    insert into activity_log (org_id, client_id, actor, action, payload)
    values (
      new.org_id,
      new.id,
      auth.uid(),
      'status_changed',
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger trg_client_status_change
  after update of status on clients
  for each row execute function log_client_status_change();

-- ── Change-request quota check ────────────────────────────────
create or replace function change_requests_this_month(p_client_id uuid, p_billing_month text)
returns integer language sql stable as $$
  select count(*)::integer
  from change_requests
  where client_id = p_client_id
    and billing_month = p_billing_month
    and status != 'rejected';
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================
alter table organizations    enable row level security;
alter table profiles         enable row level security;
alter table clients          enable row level security;
alter table client_assets    enable row level security;
alter table subscriptions    enable row level security;
alter table invoices         enable row level security;
alter table change_requests  enable row level security;
alter table activity_log     enable row level security;
-- webhook_events and webhook_events have no RLS — service role only

-- Helper: extract custom claim
create or replace function get_my_claim(claim text)
returns text language sql stable as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> claim,
    ''
  );
$$;

-- ── organizations ────────────────────────────────────────────
create policy "super_admin sees all orgs"
  on organizations for select
  using (get_my_claim('role') = 'super_admin');

create policy "admin sees own org"
  on organizations for select
  using (id::text = get_my_claim('org_id'));

create policy "super_admin full on orgs"
  on organizations for all
  using (get_my_claim('role') = 'super_admin');

-- ── profiles ─────────────────────────────────────────────────
create policy "users see own profile"
  on profiles for select using (id = auth.uid());

create policy "admin sees org profiles"
  on profiles for select
  using (
    get_my_claim('role') = 'admin'
    and org_id::text = get_my_claim('org_id')
  );

create policy "super_admin sees all profiles"
  on profiles for all
  using (get_my_claim('role') = 'super_admin');

-- ── clients ──────────────────────────────────────────────────
create policy "admin full access own org clients"
  on clients for all
  using (
    get_my_claim('role') = 'admin'
    and org_id::text = get_my_claim('org_id')
  );

create policy "client sees own record"
  on clients for select
  using (
    get_my_claim('role') = 'client'
    and id::text = get_my_claim('client_id')
  );

create policy "super_admin full on clients"
  on clients for all
  using (get_my_claim('role') = 'super_admin');

-- ── client_assets ─────────────────────────────────────────────
create policy "admin full on org assets"
  on client_assets for all
  using (
    get_my_claim('role') = 'admin'
    and org_id::text = get_my_claim('org_id')
  );

create policy "client read own assets"
  on client_assets for select
  using (
    get_my_claim('role') = 'client'
    and client_id::text = get_my_claim('client_id')
  );

create policy "super_admin full on assets"
  on client_assets for all
  using (get_my_claim('role') = 'super_admin');

-- ── invoices ─────────────────────────────────────────────────
create policy "admin read org invoices"
  on invoices for select
  using (
    get_my_claim('role') = 'admin'
    and org_id::text = get_my_claim('org_id')
  );

create policy "client read own invoices"
  on invoices for select
  using (
    get_my_claim('role') = 'client'
    and client_id::text = get_my_claim('client_id')
  );

create policy "super_admin full on invoices"
  on invoices for all
  using (get_my_claim('role') = 'super_admin');

-- ── subscriptions ────────────────────────────────────────────
create policy "admin read org subscriptions"
  on subscriptions for select
  using (
    get_my_claim('role') = 'admin'
    and org_id::text = get_my_claim('org_id')
  );

create policy "client read own subscription"
  on subscriptions for select
  using (
    get_my_claim('role') = 'client'
    and client_id::text = get_my_claim('client_id')
  );

create policy "super_admin full on subscriptions"
  on subscriptions for all
  using (get_my_claim('role') = 'super_admin');

-- ── change_requests ──────────────────────────────────────────
create policy "admin full on org requests"
  on change_requests for all
  using (
    get_my_claim('role') = 'admin'
    and org_id::text = get_my_claim('org_id')
  );

create policy "client own requests"
  on change_requests for all
  using (
    get_my_claim('role') = 'client'
    and client_id::text = get_my_claim('client_id')
  );

create policy "super_admin full on requests"
  on change_requests for all
  using (get_my_claim('role') = 'super_admin');

-- ── activity_log ─────────────────────────────────────────────
create policy "admin read org log"
  on activity_log for select
  using (
    get_my_claim('role') = 'admin'
    and org_id::text = get_my_claim('org_id')
  );

create policy "super_admin full on activity"
  on activity_log for all
  using (get_my_claim('role') = 'super_admin');

-- ============================================================
-- Auth hook: set custom JWT claims (role, org_id, client_id)
-- Add this as a Supabase Auth hook → "Custom Access Token Hook"
-- Path: set_custom_claims
-- ============================================================
create or replace function set_custom_claims(event jsonb)
returns jsonb language plpgsql as $$
declare
  profile_row profiles;
begin
  select * into profile_row from profiles where id = (event->>'user_id')::uuid;
  if not found then return event; end if;

  return jsonb_set(
    jsonb_set(
      jsonb_set(
        event,
        '{claims, role}', to_jsonb(profile_row.role::text)
      ),
      '{claims, org_id}', to_jsonb(coalesce(profile_row.org_id::text, ''))
    ),
    '{claims, client_id}', to_jsonb(coalesce(profile_row.client_id::text, ''))
  );
end;
$$;
