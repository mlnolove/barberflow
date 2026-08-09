# Como colocar o BarberFlow no ar

Guia prático — sem jargão de arquitetura, só os passos pra ver o site funcionando. Para detalhes técnicos (variáveis de ambiente, testes, decisões de arquitetura), veja o [README.md](README.md).

Existem dois cenários bem diferentes: **rodar localmente** (no seu PC, pra testar ou mostrar num vídeo/apresentação) e **colocar no ar de verdade** (um link público que qualquer pessoa acessa). Este guia cobre os dois.

---

## 1. Rodando localmente

Você precisa de 3 coisas instaladas: **Python 3.11+**, **Node.js 18+** e um **PostgreSQL** (ou Docker, que já traz o Postgres embutido).

### Opção A — Com Docker (mais simples, menos passos)

Se você tem o [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado:

```bash
# na raiz do projeto
copy .env.example .env        # Windows (PowerShell/CMD)
# cp .env.example .env        # Linux/Mac
```

Abra o `.env` e defina duas coisas (qualquer valor serve para teste local):
- `POSTGRES_PASSWORD` — uma senha qualquer
- `JWT_SECRET_KEY` — uma string aleatória longa

Depois:

```bash
docker compose up --build
```

Espere subir (primeira vez demora um pouco baixando as imagens). Com tudo no ar, popule o banco com dados de demonstração:

```bash
docker compose exec backend python -m app.seed
```

Pronto:
- Site: **http://localhost:5173**
- Login de demonstração: `admin@elitebarber.com` / `Demo@1234`

Para parar tudo: `Ctrl+C` e depois `docker compose down`.

### Opção B — Sem Docker (backend e frontend manuais)

Precisa de um PostgreSQL rodando na sua máquina (instalado nativamente).

**Backend:**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          REM Windows
# source .venv/bin/activate     # Linux/Mac

pip install -r requirements-dev.txt
copy .env.example .env          REM Windows (cp no Linux/Mac)
```

Edite `backend/.env` e ajuste `DATABASE_URL` para apontar para o seu Postgres local (usuário/senha/porta que você configurou nele).

```bash
alembic upgrade head             REM cria as tabelas
python -m app.seed               REM popula dados de demonstração
uvicorn app.main:app --reload    REM sobe o backend em http://localhost:8000
```

**Frontend** (em outro terminal, deixando o backend rodando):

```bash
cd frontend
npm install
npm run dev
```

Site em **http://localhost:5173**, login `admin@elitebarber.com` / `Demo@1234`.

### Problemas comuns

- **Porta 8000 ou 5432 já em uso**: outro programa já está usando a porta. Feche o outro programa ou troque a porta no `docker-compose.yml`/`.env`.
- **Erro de conexão com o banco**: confira se o Postgres está realmente rodando e se a senha/usuário no `DATABASE_URL` batem com o que você configurou.
- **Tela em branco no navegador**: confira o console do navegador (F12) — geralmente é o frontend não achando o backend (porta errada no proxy do Vite, arquivo `frontend/vite.config.ts`).

---

## 2. Colocando no ar de verdade (produção)

Isso ainda **não está automatizado** neste projeto (é a Fase 11 do roadmap, ainda não implementada) — não existe pipeline de deploy automático nem servidor já configurado. O caminho abaixo é o processo manual de primeira publicação.

Você precisa de 3 peças hospedadas em algum lugar:

### a) Banco de dados (PostgreSQL gerenciado)

Não hospede o banco "na mão" — use um serviço gerenciado (cuida de backup, atualização, etc.):
- [Neon](https://neon.tech) ou [Supabase](https://supabase.com) — têm plano gratuito, bom para começar
- [Railway](https://railway.app) — Postgres com um clique
- Se já usa AWS/GCP/Azure: RDS / Cloud SQL / Azure Database

Depois de criar, você recebe uma `DATABASE_URL` de conexão — guarde ela.

### b) Backend (a API FastAPI)

O projeto já tem um `backend/Dockerfile` pronto. Opções de hospedagem que leem esse Dockerfile direto:
- [Railway](https://railway.app) ou [Render](https://render.com) — mais simples, conecta no GitHub e faz deploy a cada push
- [Fly.io](https://fly.io) — bom custo-benefício, um pouco mais técnico
- Um VPS (DigitalOcean, Hetzner) rodando `docker compose up -d` — mais controle, mais trabalho manual

Configure estas variáveis de ambiente no serviço escolhido:

| Variável | Valor em produção |
|---|---|
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `DATABASE_URL` | a string do banco gerenciado (item a) |
| `JWT_SECRET_KEY` | **gere um novo valor aleatório** — nunca reaproveite o de desenvolvimento |
| `CORS_ORIGINS` | o domínio do seu frontend, ex.: `["https://seusite.com"]` |

Depois do primeiro deploy, rode as migrations uma vez (a maioria dessas plataformas tem um "console"/"shell" pra isso):

```bash
alembic upgrade head
python -m app.seed    # opcional — só se quiser os dados de demonstração
```

### c) Frontend (o site em React)

`npm run build` gera arquivos estáticos em `frontend/dist/` — não precisa de servidor Node em produção, só de algo que sirva arquivos estáticos:
- [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) — conecta no GitHub, detecta que é Vite automaticamente, deploy a cada push (mais simples de todas as opções aqui)
- Ou o `frontend/Dockerfile` (já usa Nginx por baixo) no mesmo VPS do backend

Na Vercel/Netlify, configure a variável de build que aponta pra URL do backend (o proxy `/api` do `vite.config.ts` só funciona em desenvolvimento — em produção o frontend precisa saber a URL real da API).

### d) Domínio e HTTPS

- Compre um domínio (Registro.br, Namecheap, etc.)
- Aponte o domínio principal (`seusite.com`) para o frontend
- Aponte um subdomínio (`api.seusite.com`) para o backend
- Vercel/Netlify/Railway/Render já emitem HTTPS automaticamente ao conectar um domínio — não precisa configurar certificado na mão

### Ordem recomendada

1. Banco de dados primeiro (você precisa da `DATABASE_URL` pro próximo passo)
2. Backend (rode as migrations assim que subir)
3. Frontend (só faz sentido depois que a API já responde)
4. Domínio por cima dos dois

---

## 3. App para celular (Android)

O frontend também é empacotado como app nativo Android via [Capacitor](https://capacitorjs.com) — mesmo código React, rodando dentro de um WebView nativo, instalável como qualquer app.

**O que já está pronto no projeto:**
- `frontend/capacitor.config.ts` — configuração do app (nome, ícone, splash screen)
- `frontend/android/` — projeto nativo Android completo (gerado pelo Capacitor)
- Ícone e splash screen já gerados a partir da marca do BarberFlow
- Menu lateral vira uma gaveta deslizante em telas de celular; botão físico de voltar do Android tratado
- Um **APK de debug já compilado** está em `frontend/android/app/build/outputs/apk/debug/app-debug.apk` (uma cópia também ficou em `Desktop\BarberFlow-debug.apk`)

**⚠️ Antes de instalar esse APK, uma coisa importa:** ele foi compilado apontando para o caminho relativo `/api`, que só existe quando tem um site abrindo ele — dentro do app nativo isso não resolve pra lugar nenhum ainda, porque não há backend publicado (a Fase 11 — Deploy do roadmap ainda não aconteceu). Ou seja: o app abre, mostra a tela de login, mas login ainda não vai funcionar até apontar pra um backend de verdade. Duas formas de resolver:

**Opção 1 — Testar contra o backend rodando no seu PC (mesma rede Wi-Fi):**

```bash
# descubra o IP local do seu PC (Windows: ipconfig, procure "IPv4")
# suba o backend aceitando conexões de fora do localhost:
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# rebuilde o app apontando pra esse IP:
cd frontend
VITE_API_URL=http://SEU_IP_LOCAL:8000/api npm run cap:sync
cd android
./gradlew.bat assembleDebug
```

**Opção 2 — Apontar pro backend já publicado (depois de fazer o deploy da seção 2):**

```bash
cd frontend
VITE_API_URL=https://api.seusite.com/api npm run cap:sync
cd android
./gradlew.bat assembleDebug
```

Em ambos os casos, o CORS do backend precisa liberar a origem `https://localhost` (é de onde o WebView do app carrega) — já deixei isso configurado no `docker-compose.yml`; se você configurar `CORS_ORIGINS` manualmente em outro lugar, inclua esse valor também.

### Instalando o APK no celular

1. Copie o `.apk` pro celular (cabo USB, Google Drive, e-mail — qualquer forma)
2. No celular, abra o arquivo — o Android vai pedir pra liberar "instalar de fontes desconhecidas" na primeira vez (normal para um APK de debug, fora da Play Store)
3. Abre como qualquer app instalado

### Gerando um novo APK depois de mudar o código

Nesta máquina já ficou tudo instalado (JDK 21, Android SDK). Depois de mexer no código:

```bash
cd frontend
npm run android:build:debug
```

O `.apk` novo aparece no mesmo caminho de sempre (`android/app/build/outputs/apk/debug/app-debug.apk`).

### Se quiser desenvolver com interface gráfica (Android Studio)

`npm run android:open` abre o projeto no Android Studio (se instalado) — dá emulador, debugger visual, e é o caminho recomendado se for mexer bastante no lado nativo.

### Publicando na Play Store (passo que ainda não foi feito)

Precisa de: conta de desenvolvedor Google Play (taxa única de US$25), gerar um APK/AAB **assinado** (não o de debug — outro processo, com uma chave de assinatura própria que você guarda com cuidado), e preencher a ficha da loja (descrição, screenshots, política de privacidade). Publicar na App Store da Apple exigiria além disso um Mac com Xcode — o Capacitor suporta iOS, mas não dá pra compilar iOS no Windows.

---

## Resumo rápido

| Cenário | Comando principal | Onde acessar |
|---|---|---|
| Local, com Docker | `docker compose up --build` | http://localhost:5173 |
| Local, manual | `uvicorn app.main:app --reload` + `npm run dev` | http://localhost:5173 |
| Produção | deploy no Railway/Render/Vercel (sem comando único — veja seção 2) | seu domínio |
| App Android (debug) | `npm run android:build:debug` (dentro de `frontend/`) | instala o `.apk` gerado no celular |
