<h2>Backend in Typescript initiate commands</h2>

- npm init -y
- npm i express dotenv
- npm i -D typescript @types/express @types/node
- npx tsc --init

- "outDir": "./dist"

- npx ts-node src/index.ts
- npm i -D nodemon ts-node

- "scripts": {
    "build": "npx tsc",
    "start": "node dist/index.js",
    "dev": "nodemon src/index.ts"
  }

- nodemon.json
{
  "watch": ["src"],
  "ext": "ts",
  "exec": "concurrently \"npx tsc --watch\" \"ts-node src/index.ts\""
}

<h3>Prisma:</h3>

- npm i prisma @prisma/client
- npm i bcrypt jsonwebtoken @types/bcrypt @types/jsonwebtoken

- npx prisma init

- npx prisma migrate dev
- npx prisma generate
- npx prisma studio
