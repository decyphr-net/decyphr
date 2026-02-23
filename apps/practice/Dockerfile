FROM node:23.5.0

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/practice/package.json apps/practice/
COPY libs/messaging/package.json libs/messaging/

RUN npm install

COPY apps/practice apps/practice
COPY libs libs

RUN npm run build --workspace @decyphr/messaging

WORKDIR /usr/src/app/apps/practice

RUN npm run build

COPY apps/practice/entrypoint.sh ./
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
