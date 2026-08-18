# Clicksyder 1.0.0 — pacote portátil

Sistema completo de vendas avulsas e controle de estoque, com frontend, backend, autenticação e banco de dados.

O banco começa limpo: sem produtos, vendas, funcionários ou fechamentos. A única conta criada automaticamente é:

- Usuário: `admin`
- Senha: `123`

Troque essa senha antes de usar o sistema em uma operação real.

## Requisitos

- Node.js 22 ou superior.
- npm 10 ou superior.

## Rodar localmente

1. Extraia o ZIP.
2. Abra um terminal na pasta do projeto.
3. Execute `npm install`.
4. Copie `.env.example` para `.env.local`.
5. Execute `npm run dev`.
6. Abra `http://localhost:3000`.

Sem configurar um banco externo, o sistema cria o arquivo local `clicksyder.db` automaticamente.

## Rodar com Docker

Execute `docker compose up --build -d` e abra `http://localhost:3000`.

O banco fica salvo no volume `clicksyder_data`, mesmo após reiniciar o contêiner.

## Publicar na Vercel ou Netlify

Essas plataformas não mantêm arquivos SQLite locais entre execuções. Crie um banco libSQL/Turso e configure estas variáveis na hospedagem:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Depois importe a pasta em um repositório Git e conecte-o à Vercel ou Netlify. Ambas detectam Next.js automaticamente. Também é possível usar as CLIs oficiais a partir da raiz do projeto.

Na Netlify, use como comando de build `npm run build` e diretório de publicação `.next` caso a detecção automática não preencha esses campos.

## Outras hospedagens

Qualquer hospedagem com Node.js 22 pode usar `npm install`, `npm run build` e `npm start`. Para servidores tradicionais, o banco SQLite local funciona. Para ambientes serverless, configure um banco libSQL remoto.

## Comandos

- `npm run dev`: desenvolvimento.
- `npm run build`: compilação de produção.
- `npm start`: servidor de produção.
- `npm run typecheck`: validação do TypeScript.
- `npm test`: compilação e teste completo do login e banco vazio.

## Dados e segurança

- Senhas são armazenadas com PBKDF2; nunca em texto puro.
- Sessões usam cookies `HttpOnly`.
- Valores monetários são armazenados em centavos.
- O banco e as tabelas são criados automaticamente na primeira execução.
- Nenhum dado do site publicado foi incluído neste pacote.
