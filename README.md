# PinPrice

PinPrice is a mobile-first utility app for online sellers who need to add price and status tags onto product photos quickly.

Built with React Native and Expo. MVP is local-first (no backend).

## Purpose

Help sellers tag multiple items in one photo faster than Canva, Phonto, or story editors.

Core flow:

Take or choose photo → tap item → add price/status tag → adjust position → preview → save/share

Target users include TCG card sellers, collectibles sellers, second-hand clothing sellers, shoes/denim/accessories sellers, and live sale sellers.

## Tech Stack

- React Native
- Expo
- Expo Router
- TypeScript

## MVP Scope (high level)

- Choose image / take photo
- Add, edit, drag, delete tags
- Tag types: Price, Sold, Reserved
- Undo
- Preview, save, share

Out of scope for MVP: login, backend, cloud sync, marketplace, inventory, payments, web support, AI detection.

See `PROJECT_DIRECTION.md` and `.cursorrules` for full product rules.

## Run The App

Install dependencies:

```bash
npm install
```

Start the development build:

```bash
npm run start:dev
```

## Notes

- This project is in active development.
- Do not commit local environment secrets.
- Product copy and seller flows should consider both Thai and English.
