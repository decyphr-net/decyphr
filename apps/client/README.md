<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).


# Navigation & Sidebar Structure Plan

This document defines the **global navigation model** for the app. Its purpose is to prevent feature sprawl, keep UX consistent as features grow, and give you a stable mental model to return to.

---

## 1. Global Navigation Philosophy

Navigation is organized by **learning role**, not by individual features.

Top-level navigation answers:

> *“What kind of learning do I want to do right now?”*

Not:

> *“What tool do I want to click?”*

---

## 2. Top-Level Navigation (Primary Nav)

This should live in the **main sidebar / header**.

```
Dashboard

Interaction
Knowledge
Practice
Reflection
```

Each item opens either:

* A landing page **or**
* A default workspace

---

## 3. Dashboard (Orientation Layer)

**Purpose:** quick entry + high-level progress

### Dashboard contains

* Mode tiles (not deep links)
* Light progress signals (counts, streaks, CEFR)

### Dashboard does NOT contain

* Tables
* Deep configuration
* Practice flows

Dashboard cards link to **mode landing pages**, not specific sub-features.

---

## 4. Interaction (Sidebar Group)

**Role:** Active language use (speaking & writing)

### Sidebar structure

```
Interaction
├── Chat
├── Scenarios
└── Writing Feedback
```

### Notes

* These pages share a conversational layout
* Minimal stats
* Feedback-focused UI

---

## 5. Knowledge (Sidebar Group)

**Role:** Language memory & reference

### Sidebar structure

```
Knowledge
├── Lexicon
│   ├── Overview
│   ├── Words
│   ├── Statements
│   ├── Meanings & Notes
│   └── Import / History
│
└── Vault
    ├── Saved Sentences
    ├── Saved Translations
    └── Personal Notes
```

### Lexicon rules

* Acts as **source of truth**
* Stats live only in Overview
* Other tabs are operational

---

## 6. Practice (Sidebar Group)

**Role:** Skill training & reinforcement

### Sidebar structure

```
Practice
├── Translation
│   ├── Translate
│   ├── Vault
│   ├── Review
│   └── Stats
│
├── Flashcards
├── Guess the Meaning
├── Verb Practice
└── Mistake Correction
```

### Notes

* Practice pages consume Lexicon data
* Review pages are repetitive & focused
* Stats mirror Lexicon Stats visually

---

## 7. Reflection (Sidebar Group)

**Role:** Progress & insight

### Sidebar structure

```
Reflection
├── Overall Progress
├── Lexicon Stats
├── Translation Stats
└── Interaction Stats
```

### Rules

* Charts allowed here
* CEFR trends belong here
* No direct practice actions

---

## 8. Visual Consistency Rules

### Workspace pages

* One main task
* Minimal distractions
* Strong focus hierarchy

### Stats pages

* Cards → charts → tables
* Consistent color language
* Comparable layouts across domains

### Interaction pages

* Chat-first
* Feedback inline
* Metrics secondary or hidden

---

## 9. Feature Placement Cheat Sheet

| Feature           | Mode        | Location              |
| ----------------- | ----------- | --------------------- |
| Chat              | Interaction | Interaction → Chat    |
| Lexicon Table     | Knowledge   | Lexicon → Words       |
| Flashcards        | Practice    | Practice → Flashcards |
| Translation Vault | Practice    | Translation → Vault   |
| CEFR Summary      | Reflection  | Overall Progress      |
| Confidence Score  | Reflection  | Stats pages only      |

---

## 10. Decision Test (Use This)

Before adding a feature, answer:

1. Which mode does this belong to?
2. Is it reference, action, training, or insight?
3. Does it need stats or flow?

If the answer isn’t obvious, the feature is underspecified.

---

## 11. One-Line Summary (for future you)

> *Dashboard chooses the mode. Sidebar chooses the task. Pages do one job well.*
