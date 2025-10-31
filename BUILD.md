# Building and Distributing Powder-AI

This guide covers building and distributing Powder-AI for users.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Build](#development-build)
3. [Production Build](#production-build)
4. [Platform-Specific Builds](#platform-specific-builds)
5. [Troubleshooting](#troubleshooting)
6. [Distribution](#distribution)

---

## Prerequisites

### System Requirements

- **Node.js**: 14.x or higher
- **Python**: 3.8 or higher
- **npm**: 6.x or higher
- **Git**: For version control

### Development Tools

```bash
# Install Node.js (if not already installed)
# Visit: https://nodejs.org/

# Verify installation
node --version
npm --version
python3 --version
```

### Install Project Dependencies

```bash
# Install Node dependencies
npm install

# Install Python dependencies
pip install -r src/python/requirements.txt
```

---

## Development Build

### Running in Development Mode

```bash
# Start the application in development mode
npm start
```

This will:
- Start the Python engine
- Launch Electron with hot reload
- Open dev tools for debugging
- Enable verbose logging

### Features in Development Mode

- ✅ Hot reload on code changes
- ✅ Chrome DevTools available
- ✅ Full logging output
- ✅ Detailed error messages
- ✅ Source maps for debugging

### Development Workflow

```bash
# Terminal 1: Start the app
npm start

# Terminal 2: Watch for changes and rebuild TypeScript
npm run typecheck

# Browser: DevTools (F12)
# - Console for logs
# - Network tab for IPC
# - Source maps for debugging
```

---

## Production Build

### Prerequisites for Production Build

1. **Code compiled**: TypeScript → JavaScript
2. **Dependencies resolved**: All packages installed
3. **Assets optimized**: Images, styles minified
4. **Tests passing**: (Optional but recommended)

### Build Process

```bash
# Step 1: Build TypeScript
npm run typecheck

# Step 2: Package application
npm run build

# Step 3: Create distribution (platform-specific)
npm run dist
```

### What Gets Built

```
dist/
├── Powder-AI-0.1.0.exe         (Windows installer)
├── Powder-AI-0.1.0-arm64.dmg   (macOS)
├── Powder-AI-0.1.0.AppImage    (Linux)
└── Powder-AI-0.1.0.snap        (Linux snap)
```

### Build Configuration

The `electron-builder` configuration is in `package.json`:

```json
{
  "build": {
    "appId": "com.powder-ai.app",
    "productName": "Powder-AI",
    "files": [
      "src/**/*",
      "public/**/*",
      "package.json"
    ],
    "directories": {
      "buildResources": "public",
      "output": "dist"
    }
  }
}
```

---

## Platform-Specific Builds

### Windows Build

```bash
# Build for Windows
npm run build -- --win

# Create installer
npm run dist -- --win
```

**Output:**
- `dist/Powder-AI-0.1.0.exe` - Installer
- `dist/Powder-AI Setup 0.1.0.exe` - Portable

**Requirements:**
- Windows 7 or higher
- .NET Framework 4.5+ (usually pre-installed)

### macOS Build

```bash
# Build for macOS
npm run build -- --mac

# Create DMG
npm run dist -- --mac
```

**Output:**
- `dist/Powder-AI-0.1.0.dmg` - Disk image

**Requirements:**
- macOS 10.13 or higher
- Apple Silicon (arm64) or Intel (x64)

### Linux Build

```bash
# Build for Linux
npm run build -- --linux

# Create AppImage
npm run dist -- --linux appimage

# Create Snap
npm run dist -- --linux snap
```

**Output:**
- `dist/Powder-AI-0.1.0.AppImage` - Standalone
- `dist/Powder-AI-0.1.0.snap` - Snap package

**Requirements:**
- Ubuntu 16.04+, Debian 9+, or equivalent

---

## Code Signing (Production)

### macOS Code Signing

For distribution on macOS, you'll need to code sign:

```bash
# Set up code signing certificate
export APPLE_ID="your-apple-id@example.com"
export APPLE_PASSWORD="your-app-password"

# Build will automatically sign
npm run dist -- --mac
```

### Windows Signing

For trusted installation on Windows:

```bash
# Add signing certificate
set WIN_SIGNING_CERT=your-cert.pfx
set WIN_SIGNING_PASSWORD=your-password

npm run dist -- --win
```

---

## Creating Release Packages

### Step 1: Update Version

Edit `package.json`:

```json
{
  "version": "0.2.0",
  "description": "Cross-platform game video analyzer"
}
```

### Step 2: Build All Platforms

```bash
# Build for all platforms
npm run dist

# Or specific platform
npm run dist -- --win    # Windows
npm run dist -- --mac    # macOS
npm run dist -- --linux  # Linux
```

### Step 3: Generate Release Notes

Create `CHANGELOG.md`:

```markdown
# Version 0.2.0 (2024-02-15)

## Features
- Added Battlefield game support
- Improved OCR accuracy
- New events filtering in UI

## Bug Fixes
- Fixed progress bar animation
- Fixed color detection edge case

## Breaking Changes
None

## Migration Guide
No migration needed.
```

### Step 4: Create Release

```bash
# Tag the release
git tag -a v0.2.0 -m "Release version 0.2.0"
git push origin v0.2.0

# Create GitHub release with dist files
# Visit: https://github.com/your-repo/releases/new
```

---

## Packaging Configuration

### Customizing the Build

Edit `package.json` build section:

```json
{
  "build": {
    "appId": "com.powder-ai.app",
    "productName": "Powder-AI",
    "artifactName": "${productName}-${version}.${ext}",

    "win": {
      "target": [
        "nsis",
        "portable"
      ]
    },

    "mac": {
      "target": [
        "dmg",
        "zip"
      ]
    },

    "linux": {
      "target": [
        "AppImage",
        "snap"
      ]
    },

    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

---

## Troubleshooting

### Build Fails on TypeScript Errors

```bash
# Check for TypeScript errors
npm run typecheck

# Fix common issues
npx tsc --noEmit --listFiles
```

### Native Module Build Issues

```bash
# Rebuild native modules
npm rebuild

# Clear build cache
rm -rf build/ dist/ node_modules/.cache
npm install
```

### Python Engine Not Included

```bash
# Ensure Python files are copied
# Check package.json "files" array includes src/python/

# Manually verify
ls dist/resources/app/src/python/
```

### Permission Denied Errors

```bash
# Make scripts executable
chmod +x src/python/engine.py

# Rebuild
npm run build
```

### Out of Memory During Build

```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dist
```

---

## Testing the Build

### Pre-Distribution Testing

```bash
# 1. Run basic functionality test
npm start

# 2. Test game analysis workflow
# - Select video
# - Choose game
# - Run analysis
# - Verify results

# 3. Check logs for errors
tail -f ~/.powder-ai/logs/*.log

# 4. Test error scenarios
# - Invalid video file
# - Missing game
# - Network interruption
```

### Post-Distribution Testing

After creating distribution packages:

1. **Windows**: Install .exe and test
2. **macOS**: Mount DMG and test
3. **Linux**: Install AppImage and test

---

## Distribution Setup

### GitHub Releases

```bash
# Create release on GitHub
gh release create v0.2.0 \
  dist/Powder-AI-0.2.0.exe \
  dist/Powder-AI-0.2.0.dmg \
  dist/Powder-AI-0.2.0.AppImage \
  --title "Version 0.2.0" \
  --notes "Release notes here"
```

### Website Download Link

Add to your website:

```html
<a href="https://github.com/your-repo/releases/download/v0.2.0/Powder-AI-0.2.0.exe">
  Download for Windows
</a>
```

### Auto-Update (Optional)

Electron supports auto-updates. To enable:

```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/build.yml`:

```yaml
name: Build

on:
  push:
    tags:
      - v*

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 16
      - run: npm install
      - run: npm run dist
      - uses: actions/upload-artifact@v2
        with:
          name: ${{ matrix.os }}
          path: dist/
```

---

## Distribution Checklist

- [ ] Version updated in package.json
- [ ] CHANGELOG.md updated
- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] Code reviewed
- [ ] Build tested on all platforms
- [ ] Release notes prepared
- [ ] GitHub release created
- [ ] Download links verified
- [ ] Auto-update configured (if enabled)

---

## File Size Optimization

### Current Sizes

- Windows .exe: ~200-300 MB (includes Python, Lua, ML models)
- macOS .dmg: ~250-350 MB
- Linux AppImage: ~280-380 MB

### Reducing Size

```bash
# Strip debug symbols
npm run build -- --productionSourceMap false

# Remove unused dependencies
npm prune --production

# Clean build
rm -rf build dist node_modules
npm ci --production
npm run dist
```

---

## Deployment

### Internal Testing

```bash
# Build for internal testing
npm run build
npm run dist

# Distribute within organization
# Share dist/ files via internal channels
```

### Public Release

```bash
# Create public release
npm run dist

# Push to GitHub
git push origin main
git push origin --tags

# Create GitHub release with binaries
```

---

## Support and Updates

### Version Management

Use semantic versioning:
- `0.1.0` - Initial release
- `0.2.0` - Feature release
- `0.2.1` - Bug fix release
- `1.0.0` - Major version

### Release Schedule

- Monthly feature releases
- Weekly security patches if needed
- Long-term support branch (optional)

---

## Next Steps

1. [Build for your platform](#platform-specific-builds)
2. [Test the build](#testing-the-build)
3. [Create distribution packages](#distribution-setup)
4. [Share with users](#deployment)
5. [Set up CI/CD](#cicd-integration)

---

For more information, see:
- [electron-builder Documentation](https://www.electron.build/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
