FROM node:23.5.0
WORKDIR /usr/src/app

# Copy package.json and tsconfig files
COPY package*.json tsconfig*.json ./

# Copy source code
COPY . .

# Install all dependencies including dev (for build)
RUN npm install

# Build TypeScript
RUN npm run build

# Remove src if you want (optional)
# RUN rm -r src

# Entrypoint
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]