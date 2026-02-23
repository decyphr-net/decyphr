FROM node:23.5.0

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/courses/package.json apps/courses/

RUN npm install

COPY apps/courses apps/courses

WORKDIR /usr/src/app/apps/courses

RUN npm run build

COPY apps/courses/entrypoint.sh ./
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
