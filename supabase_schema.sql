-- Supabase Database Schema for Enterprise CRM & Field Dispatch Engine

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Custom Data Enums
CREATE TYPE client_stage AS ENUM ('Quoted', 'Scheduled', 'Completed');
CREATE TYPE job_status AS ENUM ('Pending', 'Confirmed', 'Completed');
CREATE TYPE invoice_status AS ENUM ('Pending', 'Paid', 'Overdue');
CREATE TYPE crew_unit AS ENUM ('Truck 1', 'Truck 2', 'Crew Alpha', 'Crew Bravo');

-- 3. Tenants Table (Multi-Tenant Isolation)
CREATE TABLE public.tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  email TEXT NOT NULL,
  billing_company TEXT,
  storage_prefix TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Users Table (Maps to Supabase Auth Users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Clients Directory Table
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT NOT NULL,
  city_zip TEXT DEFAULT 'Richmond, VA 23220',
  status client_stage DEFAULT 'Quoted',
  total_spent NUMERIC(10,2) DEFAULT 0.00,
  last_service TEXT,
  notes TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Map Pins Table (GIS Navigation & Map Markers)
CREATE TABLE public.map_pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  zip TEXT,
  service TEXT NOT NULL,
  value NUMERIC(10,2) DEFAULT 0.00,
  status client_stage DEFAULT 'Quoted',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Dispatch Jobs / Calendar Events Table
CREATE TABLE public.dispatch_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.map_pins(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_hours NUMERIC(3,1) DEFAULT 2.0,
  service TEXT NOT NULL,
  crew crew_unit DEFAULT 'Truck 1',
  status job_status DEFAULT 'Confirmed',
  amount NUMERIC(10,2) DEFAULT 0.00,
  address TEXT NOT NULL,
  google_synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Invoices Table
CREATE TABLE public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status invoice_status DEFAULT 'Pending',
  service_description TEXT NOT NULL,
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SMS Messages Table
CREATE TABLE public.sms_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  sender_type TEXT CHECK (sender_type IN ('system', 'client', 'user')),
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Enable Row Level Security (RLS) & Multi-Tenant Isolation
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispatch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for clients" ON public.clients
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for map_pins" ON public.map_pins
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for dispatch_jobs" ON public.dispatch_jobs
  USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));
