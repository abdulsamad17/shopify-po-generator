# Contributing to Shopify PO Generator

Thank you for your interest in contributing to the Shopify PO Generator! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Browser version** and operating system
- **Shopify admin page** where the issue occurred

### Suggesting Features

Feature suggestions are welcome! Please:

- Check if the feature has already been requested
- Provide a clear description of the feature
- Explain the use case and benefits
- Consider the scope and complexity

### Development Workflow

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/shopify-po-generator.git
   cd shopify-po-generator
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b bugfix/issue-description
   ```

3. **Make Changes**
   - Follow the existing code style
   - Test your changes thoroughly
   - Update documentation if needed

4. **Test the Extension**
   - Load the extension in Chrome developer mode
   - Test on actual Shopify PO pages
   - Verify Excel generation works correctly

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   # or
   git commit -m "fix: resolve issue description"
   ```

6. **Push and Create PR**
   ```bash
   git push origin your-branch-name
   ```
   Then create a Pull Request on GitHub.

## 📝 Code Guidelines

### JavaScript Style
- Use **ES6+** features where appropriate
- Follow **camelCase** naming convention
- Add **comments** for complex logic
- Use **async/await** for asynchronous operations
- Handle **errors gracefully**

### HTML/CSS Style
- Use **semantic HTML** elements
- Follow **BEM methodology** for CSS classes
- Ensure **responsive design**
- Maintain **accessibility standards**

### Extension-Specific Guidelines
- Follow **Chrome Extension** best practices
- Use **Manifest V3** standards
- Minimize **permissions** requested
- Ensure **content security policy** compliance

## 🧪 Testing

### Manual Testing Checklist
- [ ] Extension loads without errors
- [ ] PO number and date extraction works
- [ ] Product data extraction is accurate
- [ ] Preview table displays correctly
- [ ] Excel file generates successfully
- [ ] Excel formatting is preserved
- [ ] Images are embedded properly

### Test on Multiple Scenarios
- [ ] Different Shopify store layouts
- [ ] Various product types
- [ ] Large and small PO sizes
- [ ] Different browser versions

## 📋 Pull Request Guidelines

### Before Submitting
- Ensure your code follows the style guidelines
- Test thoroughly on real Shopify pages
- Update documentation if needed
- Add or update relevant comments

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Tested on Shopify admin pages
- [ ] Excel generation verified
- [ ] Cross-browser compatibility checked

## Screenshots
Include screenshots of any UI changes
```

## 🔄 Release Process

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality
- **PATCH** version for bug fixes

### Update Checklist
- [ ] Update version in `manifest.json`
- [ ] Update changelog
- [ ] Test thoroughly
- [ ] Create release notes

## 🎯 Priority Areas

### High Priority
- **Performance optimizations**
- **Cross-browser compatibility**
- **Error handling improvements**
- **Security enhancements**

### Medium Priority
- **New Shopify features support**
- **Additional export formats**
- **UI/UX improvements**
- **Documentation updates**

### Low Priority
- **Code refactoring**
- **Developer tools**
- **Build process improvements**

## 🛠️ Development Environment

### Prerequisites
- Chrome browser (latest version)
- Text editor or IDE
- Basic knowledge of JavaScript, HTML, CSS
- Familiarity with Chrome Extensions API

### Useful Resources
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [ExcelJS Documentation](https://github.com/exceljs/exceljs)
- [Shopify Admin API](https://shopify.dev/api/admin)

## 🤔 Questions?

If you have questions about contributing:
- Open an issue with the "question" label
- Check existing documentation
- Look at closed issues for similar questions

## 📄 Code of Conduct

### Our Standards
- **Be respectful** and inclusive
- **Provide constructive** feedback
- **Focus on the issue**, not the person
- **Help others learn** and grow

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Publishing private information
- Unprofessional conduct

Thank you for contributing to make Shopify PO Generator better for everyone! 🎉
