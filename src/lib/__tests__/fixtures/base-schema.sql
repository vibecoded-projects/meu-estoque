-- Schema inicial simplificado (extraído de supabase-schema.sql)
CREATE TABLE IF NOT EXISTS namespaces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT,
  subtitle TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS namespace_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  namespace_id UUID REFERENCES namespaces(id) ON DELETE CASCADE,
  code VARCHAR(4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  namespace_id UUID REFERENCES namespaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  image_url TEXT,
  is_sold BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
