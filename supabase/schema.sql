-- ══════════════════════════════════════════════════════════
-- AGRÔNOMO IA — Schema Supabase
-- Cole este SQL no Supabase > SQL Editor > Run
-- ══════════════════════════════════════════════════════════

-- Perfis de usuário (complementa auth.users)
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  crea TEXT,
  telefone TEXT,
  email TEXT,
  plano TEXT DEFAULT 'trial',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário vê só seu perfil" ON public.perfis
  FOR ALL USING (auth.uid() = id);

-- Trigger: cria perfil automaticamente ao criar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', 'Agrônomo'), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clientes (produtores rurais)
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agronomo_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  telefone TEXT,
  email TEXT,
  municipio TEXT,
  estado TEXT DEFAULT 'MG',
  cultura_principal TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agrônomo vê seus clientes" ON public.clientes
  FOR ALL USING (auth.uid() = agronomo_id);

-- Propriedades (fazendas)
CREATE TABLE IF NOT EXISTS public.propriedades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agronomo_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  hectares NUMERIC(10,2),
  municipio TEXT,
  estado TEXT DEFAULT 'MG',
  cultura TEXT,
  talhoes TEXT,
  coordenadas TEXT,
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.propriedades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agrônomo vê suas propriedades" ON public.propriedades
  FOR ALL USING (auth.uid() = agronomo_id);

-- Visitas técnicas
CREATE TABLE IF NOT EXISTS public.visitas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agronomo_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  propriedade_id UUID REFERENCES public.propriedades(id) ON DELETE SET NULL,
  data_visita DATE NOT NULL DEFAULT CURRENT_DATE,
  cultura TEXT,
  estagio TEXT,
  observacoes TEXT,
  recomendacoes TEXT,
  ph_solo NUMERIC(4,2),
  fosforo NUMERIC(8,2),
  potassio NUMERIC(8,2),
  calcario_recomendado NUMERIC(8,2),
  status TEXT DEFAULT 'realizada',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agrônomo vê suas visitas" ON public.visitas
  FOR ALL USING (auth.uid() = agronomo_id);

-- Agendamentos
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agronomo_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  propriedade_id UUID REFERENCES public.propriedades(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_min INTEGER DEFAULT 60,
  tipo TEXT DEFAULT 'visita',
  status TEXT DEFAULT 'agendado',
  lembrete_min INTEGER DEFAULT 60,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agrônomo vê seus agendamentos" ON public.agendamentos
  FOR ALL USING (auth.uid() = agronomo_id);

-- Análises de solo
CREATE TABLE IF NOT EXISTS public.analises_solo (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agronomo_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  propriedade_id UUID REFERENCES public.propriedades(id) ON DELETE SET NULL,
  visita_id UUID REFERENCES public.visitas(id) ON DELETE SET NULL,
  data_coleta DATE DEFAULT CURRENT_DATE,
  laboratorio TEXT,
  ph NUMERIC(4,2),
  materia_organica NUMERIC(6,2),
  fosforo NUMERIC(8,2),
  potassio NUMERIC(8,2),
  calcio NUMERIC(8,2),
  magnesio NUMERIC(8,2),
  enxofre NUMERIC(8,2),
  boro NUMERIC(6,3),
  interpretacao_ia TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.analises_solo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agrônomo vê suas análises" ON public.analises_solo
  FOR ALL USING (auth.uid() = agronomo_id);

-- Documentos gerados
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agronomo_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  visita_id UUID REFERENCES public.visitas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL,
  conteudo TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agrônomo vê seus documentos" ON public.documentos
  FOR ALL USING (auth.uid() = agronomo_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_agronomo ON public.clientes(agronomo_id);
CREATE INDEX IF NOT EXISTS idx_propriedades_cliente ON public.propriedades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_visitas_agronomo ON public.visitas(agronomo_id);
CREATE INDEX IF NOT EXISTS idx_visitas_cliente ON public.visitas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON public.agendamentos(agronomo_id, data_hora);
