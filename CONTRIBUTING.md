# Contributing to MongoDB Backup Manager

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/likhith1409/MongoDB-Backup-Manager.git
   cd MongoDB-Backup-Manager
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local settings
   ```

4. **Start development servers**
   ```bash
   npm run dev
   ```

### Project Structure

- `client/` - React frontend
- `server/` - Express backend
- `server/services/` - Business logic
- `server/routes/` - API endpoints

## Making Changes

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### Commit Messages

Use clear, descriptive commit messages:
```
feat: add backup compression options
fix: resolve FTP connection timeout
docs: update installation instructions
```

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add JSDoc comments for functions
- Keep functions small and focused

### Testing

Run tests before submitting:
```bash
cd server
npm test
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear commits
3. Ensure all tests pass
4. Update documentation if needed
5. Submit a pull request with a clear description

### PR Checklist

- [ ] Tests pass locally
- [ ] Code follows project style
- [ ] Documentation updated (if applicable)
- [ ] Commit messages are clear
- [ ] No console.log statements (except logging)

## Reporting Issues

When reporting bugs, please include:

- Operating system and version
- Node.js version
- MongoDB version
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs or screenshots

## Feature Requests

For new features:
- Describe the use case
- Explain the expected behavior
- Consider edge cases

## Questions?

Open an issue with the `question` label for any questions about contributing.

---

Thank you for contributing!
