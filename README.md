# Suvarna Text Editor

A modern, feature-rich text editor specifically designed for Kannada language writing with intelligent spell-checking and comprehensive formatting capabilities.

## Overview

Suvarna is a web-based text editor built with React and TypeScript that provides a distraction-free writing experience for Kannada users. It combines a clean, intuitive interface with powerful editing tools and intelligent language support.

## Features

- **Kannada Language Support**: Full Unicode support for Kannada script with comprehensive spell-checking
- **Rich Text Formatting**: Bold, italic, underline, text alignment, and text color options
- **Spell Checking**: Real-time spell-check for Kannada with suggestions for misspelled words
- **Find & Replace**: Quickly find and replace text throughout your document
- **Text Highlighting**: Color-code important passages in your text
- **Word & Character Count**: Real-time statistics displayed in the status bar
- **Modern UI**: Clean, responsive interface with dark mode support via shadcn/ui
- **Rich Editor Foundation**: Built on TipTap, a powerful and extensible rich text editor

## Tech Stack

- **Frontend Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Editor Engine**: TipTap
- **UI Components**: shadcn/ui with Radix UI
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form
- **Testing**: Vitest
- **Code Quality**: ESLint

## Project Structure

```
src/
├── components/
│   ├── EditorToolbar.tsx         # Formatting and action toolbar
│   ├── FindReplaceBar.tsx         # Find and replace functionality
│   ├── IndianTextEditor.tsx       # Main editor component
│   ├── SuggestionPopup.tsx        # Spell-check suggestions popup
│   └── ui/                        # shadcn/ui component library
├── lib/
│   ├── spellcheck.ts             # Kannada spell-checking logic
│   ├── spellcheck-extension.ts   # TipTap extension for spell-check
│   └── utils.ts                  # Utility functions
├── hooks/
│   ├── use-mobile.tsx            # Mobile responsiveness hook
│   └── use-toast.ts              # Toast notification hook
├── pages/
│   ├── Index.tsx                 # Home page
│   └── NotFound.tsx              # 404 page
├── App.tsx                       # Main app component
└── main.tsx                      # Application entry point
```

## Installation

### Prerequisites
- Node.js 18+ or Bun runtime
- npm or Bun package manager

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd "Suvarna - Text Editor"
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

## Development

### Start Development Server

```bash
npm run dev
# or
bun run dev
```

The application will be available at `http://localhost:8080`

### Build for Production

```bash
npm run build
# or
bun run build
```

### Preview Production Build

```bash
npm run preview
```

### Run Tests

```bash
# Run tests once
npm run test

# Watch mode
npm run test:watch
```

### Lint Code

```bash
npm run lint
```

## Usage

1. **Start Typing**: Click in the editor area and begin typing in Kannada
2. **Format Text**: Use the toolbar buttons or keyboard shortcuts to format text
3. **Spell Check**: Misspelled words are underlined in red. Click on them for suggestions
4. **Find & Replace**: Use Ctrl+H (or Cmd+H on Mac) to open the find/replace bar
5. **Highlight Text**: Select text and use the color picker to apply highlighting

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Bold | Ctrl+B (Cmd+B on Mac) |
| Italic | Ctrl+I (Cmd+I on Mac) |
| Underline | Ctrl+U (Cmd+U on Mac) |
| Find & Replace | Ctrl+H (Cmd+H on Mac) |
| Undo | Ctrl+Z (Cmd+Z on Mac) |
| Redo | Ctrl+Y (Cmd+Shift+Z on Mac) |

## Spell-Checking

The editor includes a Kannada spell-checker with:
- Extensive Kannada word dictionary
- Levenshtein distance algorithm for suggesting corrections
- Real-time spell-checking as you type
- Context-aware suggestions

### Dictionary

The Kannada dictionary includes common words across various categories:
- Greetings and common phrases
- Numbers and pronouns
- Places and geography
- Family relations
- Common actions and adjectives
- And more...

## Architecture

### Spell Checking System

The spell-checking system consists of three main components:

1. **Dictionary** (`spellcheck.ts`): Contains the Kannada word dictionary
2. **Detection**: Language detection (currently Kannada only)
3. **Extension** (`spellcheck-extension.ts`): TipTap plugin that integrates spell-checking with the editor

### Editor Core

- Built on TipTap, a headless editor framework
- Extensible through TipTap's plugin system
- Custom extensions for spell-checking and language support

## Configuration

### Vite Configuration

The project uses Vite for fast development and optimized builds. Key configuration:
- HMR overlay disabled for better UX
- Path alias `@` pointing to `src/`
- React SWC for fast compilation

### Tailwind CSS

Customization available in `tailwind.config.ts`

### TypeScript

Strict mode enabled for type safety. Configuration in `tsconfig.json`

## Browser Support

Works on all modern browsers that support:
- ES2020+ JavaScript
- CSS Grid and Flexbox
- Unicode support for Kannada script

## Performance

- Lightweight bundle size (~750KB gzipped)
- Lazy-loaded components
- Optimized spell-checking algorithm
- Efficient text decorations using TipTap's decoration system

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## Future Enhancements

- Support for additional Indian languages
- Offline mode with local persistence
- Export to PDF, DOCX, and other formats
- Grammar checking
- Thesaurus and synonym suggestions
- Collaborative editing
- Plugin system for extensions

## License

This project is private. All rights reserved.

## Author

Created by Chandru Vinayagam

## Support

For issues, questions, or suggestions, please open an issue in the repository.

---

**Suvarna** - Write beautifully in Kannada 🖊️
