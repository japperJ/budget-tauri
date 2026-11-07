# Budget – Tauri (Desktop App)

Full standalone desktop app (Linux/Windows/Mac) for managing bank transactions, budgets, and cashflow. Danish language, DKK.

Built with Tauri 2 + Rust + Next.js (static export) + SQLite.

## Features
- Dashboard with cashflow chart (12 months), category pie chart, top expenses
- Transactions with filtering, sorting, multi-select, bulk delete/category change
- Budget with per-category and per-account limits, auto-calculate from history
- CSV import (Danske Bank, Nordea, Jyske Bank formats) with duplicate detection
- Accounts and categories management
- Light/dark theme
- Auto-categorization (keyword rules + learning from manual categorizations)

## Build

### Prerequisites
- Rust (rustup)
- Node.js 22+
- Tauri CLI: `cargo install tauri-cli` or `pacman -S cargo-tauri`
- Linux: `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`
- Windows: Visual Studio Build Tools
- macOS: Xcode

### Development
```bash
npm install
cargo tauri dev
```

### Production build
```bash
npm install
cargo tauri build
```

Output: `src-tauri/target/release/bundle/` (deb, rpm, msi, dmg, app).

### Linux (Arch)
```bash
sudo pacman -S cargo-tauri
cargo tauri build
# Install the binary
cp src-tauri/target/release/budget-tauri ~/.local/bin/budget
```

## Versionering
Ved hver ændring bumpt version-nummeret i `package.json`, `src-tauri/tauri.conf.json` og `src/lib/version.ts`.

## Data storage
SQLite database stored in the app's data directory:
- Linux: `~/.local/share/com.budget.app/budget.db`
- Windows: `%APPDATA%/com.budget.app/budget.db`
- macOS: `~/Library/Application Support/com.budget.app/budget.db`

## Web version
The original web app is at: https://github.com/japperJ/budget