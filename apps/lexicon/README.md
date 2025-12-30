# Lexicon (apps/lexicon)

A NestJS application in the decyphr monorepo that implements the lexicon domain. This service composes domain modules (bank, interaction, statement, translation) and uses TypeORM to persist domain entities to a MariaDB database.

This README is based on the repository files (notably src/app.module.ts and the src/* subdirectories) and contains only details that appear in the codebase.

---

## What this app is

- A NestJS application (TypeScript).
- Uses @nestjs/config's ConfigModule.forRoot() to load environment configuration.
- Uses TypeORM configured for MariaDB (see src/app.module.ts).
- The application imports the following domain modules:
  - TranslationModule
  - BankModule
  - StatementModule
  - InteractionModule
- The TypeORM entity classes referenced in app.module.ts are:
  - Interaction
  - Statement
  - Word
  - User
  - UserWordStatistics

---

## How it interacts with the outside world

- Database
  - The application connects to a MariaDB database via TypeORM.
  - Connection settings are read from environment variables (see Configuration below).
  - Entities listed above are registered with TypeORM and will be synchronized at startup (the code sets `synchronize: true` in the TypeORM config).
- Application bootstrap
  - The NestJS bootstrap code is in `src/main.ts`. That file controls how the application is started (HTTP server, ports, global pipes/middleware — check the file for details).
- Modules
  - Domain logic is organized into modules located under `src/` (for example: `src/bank`, `src/interaction`, `src/statement`, `src/translation`). Inspect each module for controllers, services, and entities to determine the exact API surface and business logic.
- Containerization
  - There is a Dockerfile at `apps/lexicon/Dockerfile` for building a container image of the application.

Notes: The repository files used to prepare this README show only the module wiring and TypeORM configuration; they do not include explicit references to any auth, cache, health endpoints, or other runtime integrations in `app.module.ts`. If you need documentation of HTTP endpoints, guards, or other runtime behaviors, check the controller/service files inside each module directory.

---

## Configuration (environment variables)

From `src/app.module.ts` (TypeORM configuration) the application expects the following environment variables for database connectivity:

- MARIA_DB_HOST
- MARIA_DB_PORT
- MARIA_DB_USERNAME
- MARIA_DB_PASSWORD
- MARIA_DB_DATABASE

Because ConfigModule.forRoot() is used, other environment-driven configuration may be present in other modules; search the `src/` tree for additional configuration usage.

---

## Quickstart (local)

1. Install dependencies (run from repo root or from apps/lexicon as your workflow requires):
   - npm install

2. Inspect package.json in `apps/lexicon/package.json` for available scripts and use them (e.g., development or production start scripts). The exact script names live in that file.

3. Provide the required environment variables (at minimum the MARIA_DB_* variables) and run the app using the repository's preferred script.

4. To build a Docker image (example):
   - docker build -t decyphr-lexicon:latest -f apps/lexicon/Dockerfile .

   Then run, supplying environment variables:
   - docker run --rm -e MARIA_DB_HOST=... -e MARIA_DB_PORT=... -e MARIA_DB_USERNAME=... -e MARIA_DB_PASSWORD=... -e MARIA_DB_DATABASE=... decyphr-lexicon:latest

---

## Project layout (as present in repo)

Key files and directories (found in the repository):

- apps/lexicon/
  - Dockerfile
  - package.json
  - tsconfig.json
  - tsconfig.build.json
  - nest-cli.json
  - src/
    - app.module.ts
    - main.ts
    - bank/            (bank domain module and entities)
    - interaction/     (interaction domain module and entities)
    - statement/       (statement domain module and entities)
    - translation/     (translation domain module)
  - test/             (tests directory present in repo)

Inspect each module directory for controllers, services, DTOs, entities, and tests to get the complete implementation.

---

## Tests & linting

- The repository contains test and TypeScript configuration files. See `apps/lexicon/package.json` for the exact test and lint scripts (names and behavior are defined there).

---

## Troubleshooting pointers

- If the application fails to connect to the database:
  - Verify MARIA_DB_* environment variables.
  - Ensure the MariaDB server is reachable from where the app is running.
- If entities are not persisted as expected:
  - Check that the entity classes are exported and included in the `entities` array in the TypeORM configuration (app.module.ts lists the entities currently in use).
- For runtime behavior (endpoints, request/response shapes), consult the controller files inside each domain module.

---

## Where to look in the code for more detail

- Bootstrap and global configuration: `src/main.ts`
- Module wiring and TypeORM config: `src/app.module.ts`
- Domain implementation:
  - `src/bank`
  - `src/interaction`
  - `src/statement`
  - `src/translation`
- Dockerfile: `apps/lexicon/Dockerfile`
- Scripts & dependencies: `apps/lexicon/package.json`
- TypeScript config: `apps/lexicon/tsconfig.json`, `apps/lexicon/tsconfig.build.json`
