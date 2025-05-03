# My Speaker Deck

A collection of presentation slides from my talks and presentations. This repository serves as a central hub for slides I've presented at various conferences, meetups, and technical events.

## Overview

This repository uses Astro to create a static website that showcases my presentation slides in an organized and accessible manner. It provides an easy way to browse and access all my public presentations in one place.

## Features

- Organized collection of presentation slides
- Clean, responsive interface for viewing slides
- Easy navigation between different presentations
- Detailed information about each presentation

## Technical Details

This project is built with Astro, a modern static site generator that delivers lightning-fast performance with minimal JavaScript.

### Project Structure

```
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```

### Development Commands

| Command | Action |
|---------|--------|
| `npm install` | Installs dependencies |
| `npm run dev` | Starts local dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview build locally before deploying |
| `npm run astro ...` | Run CLI commands like `astro add`, `astro check` |

## Presentations

This collection includes slides on various technical topics including:

- Web application development
- TypeScript/JavaScript programming
- Terraform/HCL for infrastructure as code
- AI-powered application development
- Cloud services and architecture
- SRE practices and methodologies

Each presentation includes metadata such as the event name, date presented, and a brief description of the content.

## Using This Repository

You can browse the presentations directly on the GitHub Pages site for this repository or clone it locally to run on your own machine.

To run locally:

```bash
# Clone the repository
git clone https://github.com/tubone24/my-speaker-deck.git

# Navigate to the project directory
cd my-speaker-deck

# Install dependencies
npm install

# Start development server
npm run dev
```

## About Speaker Deck

[Speaker Deck](https://speakerdeck.com) is a platform for sharing presentation slides. While GitHub doesn't allow direct embedding of Speaker Deck slides in README files due to security restrictions, this repository provides an alternative way to organize and showcase these presentations.

## License

This project is available under the MIT License.
