FROM node:23.5.0

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/challenges/package.json apps/challenges/

RUN npm install

COPY apps/challenges apps/challenges

WORKDIR /usr/src/app/apps/challenges

RUN npm run build

CMD ["npm", "run", "start:prod"]
