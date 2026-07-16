# Negotiation AI — versão Vercel

Front-end estático (`index.html`, `style.css`, `app.js`) + backend em
funções serverless (`api/`), banco de dados **Turso** (SQLite hospedado)
e autenticação via **JWT em cookie httpOnly**.

## Por que mudou de arquitetura

A Vercel não sustenta um servidor Node tradicional nem um arquivo SQLite
local — cada requisição pode rodar numa instância diferente e o sistema
de arquivos não é persistente entre execuções. Por isso:

- Cada rota da API virou um arquivo em `api/` (a Vercel detecta isso
  automaticamente, sem configuração extra).
- O SQLite local virou **Turso**, que é hospedado e fala o mesmo SQL.
- A sessão em memória (`express-session`) virou um **JWT assinado**
  guardado num cookie `httpOnly` — não depende de nenhum estado guardado
  no servidor entre requisições.

## Passo 1 — Criar o banco no Turso (gratuito)

```bash
# instalar a CLI do Turso
curl -sSfL https://get.tur.so/install.sh | bash

# criar conta / logar
turso auth signup   # ou: turso auth login

# criar o banco
turso db create negotiation-ai

# pegar a URL de conexão
turso db show negotiation-ai --url

# gerar um token de acesso
turso db tokens create negotiation-ai
```

Guarde a URL (algo como `libsql://negotiation-ai-SEUUSUARIO.turso.io`) e
o token gerado — são o `TURSO_DATABASE_URL` e o `TURSO_AUTH_TOKEN`.

As tabelas são criadas automaticamente na primeira requisição à API
(não precisa rodar nenhuma migração manual).

## Passo 2 — Configurar variáveis de ambiente na Vercel

No painel do projeto na Vercel: **Settings → Environment Variables**,
adicione (para Production, Preview e Development):

| Nome                 | Valor                                  |
|----------------------|-----------------------------------------|
| `TURSO_DATABASE_URL` | a URL do passo 1                        |
| `TURSO_AUTH_TOKEN`   | o token do passo 1                      |
| `JWT_SECRET`         | uma string aleatória longa (ex: `openssl rand -hex 32`) |

## Passo 3 — Deploy

**Opção A — pelo dashboard:** suba esta pasta para um repositório
GitHub e importe o repositório em vercel.com/new. A Vercel detecta o
front-end estático e as funções em `api/` automaticamente — não precisa
de `vercel.json`.

**Opção B — pela CLI:**

```bash
npm install -g vercel
vercel login
vercel        # deploy de preview
vercel --prod # deploy de produção
```

## Testar localmente antes de publicar

```bash
npm install -g vercel
vercel link          # conecta esta pasta a um projeto Vercel
vercel env pull       # baixa as variáveis de ambiente pra .env.local
vercel dev            # roda tudo localmente, incluindo as funções de api/
```

Abra **http://localhost:3000**.

## Estrutura do projeto

```
index.html, style.css, app.js   → front-end estático (servido direto)
api/register.js                 → POST /api/register
api/login.js                    → POST /api/login
api/logout.js                   → POST /api/logout
api/session.js                  → GET  /api/session
api/career/index.js             → GET, PUT /api/career
api/career/contract/index.js    → POST /api/career/contract
api/career/contract/[id]/close.js → POST /api/career/contract/:id/close
lib/db.js                       → conexão com o Turso + criação de tabelas
lib/auth.js                     → JWT + cookie de sessão
```

## Limitações conhecidas

- Uma carreira ativa por conta.
- "Fim de temporada" é registrado manualmente pelo jogador, não há
  calendário simulado.
- Não há recuperação de senha por e-mail.
- O plano gratuito do Turso tem limite de linhas lidas/gravadas por mês
  — mais que suficiente pra uso pessoal ou entre amigos, mas vale
  acompanhar o painel do Turso se o tráfego crescer.
