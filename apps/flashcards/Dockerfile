FROM node:23.5.0

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/flashcards/package.json apps/flashcards/
COPY libs/messaging/package.json libs/messaging/

RUN npm install

COPY apps/flashcards apps/flashcards
COPY libs libs

RUN npm run build --workspace @decyphr/messaging

WORKDIR /usr/src/app/apps/flashcards

RUN npm run build

COPY apps/flashcards/entrypoint.sh .
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
