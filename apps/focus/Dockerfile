FROM node:23.5.0

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/focus/package.json apps/focus/

RUN npm install

COPY apps/focus apps/focus

WORKDIR /usr/src/app/apps/focus

RUN npm run build

CMD ["npm", "run", "start:prod"]
