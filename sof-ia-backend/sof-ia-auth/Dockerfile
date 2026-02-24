FROM node:20

WORKDIR /app

COPY sof-ia-backend/sof-ia-auth/package*.json ./

RUN npm install

COPY sof-ia-backend/sof-ia-auth ./

RUN npx prisma generate --schema prisma/schema.prisma

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
