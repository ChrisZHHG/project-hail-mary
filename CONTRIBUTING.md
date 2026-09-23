# Contributing to Project Hail Mary

Thank you for your interest in contributing! This document provides the essentials
to get you up and running.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [pnpm](https://pnpm.io/) package manager

### Local Development

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/project-hail-mary.git
   cd project-hail-mary
   ```

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Run the development server:**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production:**

   ```bash
   pnpm build
   pnpm start
   ```

### Testing

Run the test suite with:

```bash
pnpm test              # run once
pnpm test:watch        # watch mode
```

### Linting & Type Checking

Before submitting a PR, ensure your code passes:

```bash
pnpm lint              # ESLint
pnpm typecheck         # TypeScript
```

## Opening a Pull Request

1. **Fork the repository** and create a new branch from `main`:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit them with clear, descriptive messages.

3. **Push your branch** to your fork:

   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a pull request** against the `main` branch. Include:
   - A clear description of the changes
   - Any relevant issue numbers (e.g., "Fixes #123")
   - Screenshots or videos for UI changes

5. **Respond to feedback** from reviewers and update your PR as needed.

## Code Style

- Follow the existing code conventions (enforced by ESLint and TypeScript).
- Write meaningful commit messages.
- Keep changes focused—one feature or fix per PR.

## Questions?

Feel free to open an issue for discussion before starting work on a large feature.

---

Happy coding! 🚀
