# INNSMOUTH — L'Appel de Cthulhu

A first-person Lovecraftian horror exploration game in the browser. You wake up alone in a fog-drowned fishing port: find the five relics of the cult and break the ritual at the lighthouse before madness — or the Thing — gets you.

**Play it here:** https://innsmouth.vercel.app

This is a learning experiment, not a product — built to learn 3D game dev with an AI coding agent (Google Antigravity). Chill side project, kept as is.

## The game

- Explore a procedural 3D port: wet cobblestones, rain, lighthouse beam, fog
- 5 relics to collect, sanity meter (0–100), a creature hunting you
- 3 difficulty modes: Exploration, Cauchemar, Folie pure
- Sound engine (Web Audio), animated menu with a wandering mini-Cthulhu

## Controls

| Key | Action |
| --- | --- |
| ZQSD / WASD | Move (AZERTY / QWERTY switchable in the menu) |
| Mouse | Look around |
| Shift | Run |
| E | Interact / pick up |
| F | Flashlight |
| H | Toggle HUD |
| P / Esc | Pause |

## Stack

React 19 + Three.js (`@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`), TypeScript, Vite.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc + vite build
```
