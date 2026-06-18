# 🚀 Guia de Deploy — Agrônomo IA SaaS

## PASSO 1 — Supabase (banco de dados + login)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **New Project** → dê o nome `agronomo-ia`
3. Anote a senha do banco (você vai precisar depois)
4. Aguarde o projeto criar (~2 min)
5. Vá em **SQL Editor** → cole todo o conteúdo do arquivo `supabase/schema.sql` → clique **Run**
6. Vá em **Settings → API** e copie:
   - `Project URL` → é o `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → é o `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## PASSO 2 — GitHub (repositório do código)

1. Acesse [github.com](https://github.com) e crie um repositório novo chamado `agronomo-ia-saas`
2. Deixe **privado** (Private)
3. Faça upload de todos os arquivos desta pasta para o repositório

---

## PASSO 3 — Vercel (hospedagem gratuita)

1. Acesse [vercel.com](https://vercel.com) e faça login com sua conta GitHub
2. Clique em **New Project** → selecione o repositório `agronomo-ia-saas`
3. Em **Environment Variables**, adicione:

```
NEXT_PUBLIC_SUPABASE_URL     = (do Supabase)
NEXT_PUBLIC_SUPABASE_ANON_KEY = (do Supabase)
ANTHROPIC_API_KEY            = (do console.anthropic.com)
OPENAI_API_KEY               = (opcional — do platform.openai.com)
```

4. Clique **Deploy** — em ~3 minutos seu app estará no ar!

---

## PASSO 4 — Domínio personalizado (opcional)

Na Vercel, vá em **Settings → Domains** e adicione seu domínio próprio.
Ex: `agronomo.com.br` ou `app.guaraagro.com.br`

---

## Estrutura do projeto

```
agronomo-ia-saas/
├── src/app/
│   ├── page.jsx              ← Login / Cadastro
│   ├── (protected)/
│   │   ├── dashboard/        ← Visão geral
│   │   ├── clientes/         ← Gestão de clientes
│   │   ├── propriedades/     ← Fazendas e talhões
│   │   ├── visitas/          ← Visitas técnicas
│   │   ├── agenda/           ← Calendário
│   │   ├── chat/             ← Chat com IA
│   │   ├── documentos/       ← Laudos salvos
│   │   └── imagens/          ← Geração de imagens
│   └── api/
│       ├── chat/             ← Claude API
│       ├── document/         ← Geração de documentos
│       └── image/            ← DALL-E / Pollinations
├── supabase/schema.sql       ← Estrutura do banco
└── .env.local.example        ← Variáveis de ambiente
```

---

## Custos estimados

| Serviço | Custo |
|---------|-------|
| Supabase Free | R$ 0 |
| Vercel Free | R$ 0 |
| Claude API (Haiku) | ~R$ 0,10 por 100 mensagens |
| DALL-E 3 (opcional) | ~R$ 0,20 por imagem |
| **Total para começar** | **R$ 0** |

---

## Suporte

Dúvidas? Lucas pode pedir ao Claude para ajudar a configurar qualquer etapa.
