FROM node:23.5.0

WORKDIR /usr/src/app

# --------------------------------------------------
# 1. Copy root-level dependency manifests
# --------------------------------------------------
COPY package*.json ./
COPY tsconfig.base.json ./

# App + lib package.json files (needed for file: deps)
COPY apps/phrasebook/package.json apps/phrasebook/
COPY libs/messaging/package.json libs/messaging/

# Install dependencies (resolves file:../../libs/messaging)
RUN npm install

# --------------------------------------------------
# 2. Copy source AFTER install (better caching)
# --------------------------------------------------
COPY apps/phrasebook apps/phrasebook
COPY libs libs

RUN npm run build --workspace @decyphr/messaging

# --------------------------------------------------
# 3. Build the app
# --------------------------------------------------
WORKDIR /usr/src/app/apps/phrasebook

RUN npm run build

# Optional cleanup
# RUN rm -rf src

# --------------------------------------------------
# 4. Entrypoint
# --------------------------------------------------
COPY apps/phrasebook/entrypoint.sh .
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
