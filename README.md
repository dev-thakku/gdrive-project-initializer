# Project Initializer V2 — Google Drive Workspace Add-on

A Google Workspace Add-on for Google Drive that automates project folder scaffolding from predefined or custom templates.

---

## 🚀 Features

- **Folder Hierarchy Automation**: Generates complex multi-tier folder structures in Google Drive in one click.
- **Built-in Templates**:
  - `SDLC Standard` (Plan, Requirements, Specs, Designs, Source Code, Test, Release, etc.)
  - `Agile Sprint` (Sprint Backlog, Design Assets, Dev GUI/Server, QA, Retrospective)
  - `Marketing Campaign` (Brief, Assets, Copywriting, Performance Metrics)
- **Granular Selection**: Visual tree preview with checkboxes to include/exclude specific subfolders before generation.
- **Custom Profile Management**: Create, edit, rename, and delete custom folder structures with multi-line path definitions and auto-expansion of nested paths.
- **Drive Contextual Integration**: Automatically activates when selecting a folder in Google Drive.
- **In-Memory Cache**: Prevents duplicate folder creation and Google Drive index latency.

---

## 🛠️ Tech Stack & Local IDE Development

This project is configured for seamless local development with Google Apps Script:

- **CLI Tool**: [`@google/clasp`](https://github.com/google/clasp) (Command Line Apps Script Projects)
- **Type Definitions**: [`@types/google-apps-script`](https://www.npmjs.com/package/@types/google-apps-script) for complete IDE IntelliSense & autocomplete (`CardService`, `DriveApp`, `PropertiesService`, etc.)
- **Linter**: [ESLint](https://eslint.org/) (configured for Apps Script globals)
- **Formatter**: [Prettier](https://prettier.io/)
- **Editor Integration**: VS Code / Antigravity IDE tasks & settings pre-configured in [`.vscode/`](file:///.vscode)

---

## 📋 Prerequisites

1. **Node.js** (v18+ recommended)
2. **Google Account** with access to Google Drive & Google Apps Script
3. Enable the **Google Apps Script API** in your Google Account:
   👉 [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings) (Toggle "Google Apps Script API" to **ON**)

---

## ⚡ Quick Start

### 1. Authenticate with Google (First Time)

Run the clasp login command:

```bash
npm run clasp:login
```

A browser window will open asking you to authorize Clasp with your Google account.

### 2. Connect to an Apps Script Project

#### Option A: Link an Existing Script Project

If you already have a script created on script.google.com:

1. Open [`.clasp.json`](file:///.clasp.json)
2. Replace `"sample_script_id_replace_with_yours"` with your actual Script ID (found in Apps Script Project Settings).

Or run:

```bash
npm run clasp:clone <YOUR_SCRIPT_ID>
```

#### Option B: Create a New Apps Script Project

To create a brand new standalone script in your Google Drive:

```bash
npm run clasp:create
```

---

## 💻 Available Scripts & IDE Tasks

You can run these via terminal or through the IDE Task Runner (**Cmd+Shift+P** -> **Run Task** / **Cmd+Shift+B**):

| Command                | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `npm run clasp:push`   | Pushes local code (`src/`) to Google Apps Script        |
| `npm run clasp:watch`  | Watches for file changes and auto-pushes to Apps Script |
| `npm run clasp:pull`   | Pulls the latest remote code from Apps Script           |
| `npm run clasp:open`   | Opens the Apps Script project in your browser           |
| `npm run clasp:logs`   | Streams real-time Stackdriver execution logs            |
| `npm run clasp:deploy` | Deploys a new version                                   |
| `npm run typecheck`    | Validates TypeScript / JavaScript types                 |
| `npm run lint`         | Runs ESLint to check for syntax and undefined variables |
| `npm run lint:fix`     | Fixes auto-fixable ESLint issues                        |
| `npm run format`       | Formats all code with Prettier                          |

---

## 📁 Project Structure

```
├── .clasp.json              # Clasp project configuration (scriptId, rootDir)
├── .claspignore            # Defines files to exclude from Apps Script push
├── .gitignore              # Ignores credentials, node_modules, and cache
├── .prettierrc             # Prettier formatting rules
├── eslint.config.mjs       # ESLint configuration with Apps Script globals
├── jsconfig.json / tsconfig.json # IDE IntelliSense and typechecking configuration
├── package.json            # Node scripts and dev dependencies
├── .vscode/
│   ├── extensions.json     # Recommended IDE extensions
│   ├── settings.json       # Editor formatting, language associations & linter settings
│   └── tasks.json          # Preconfigured one-click IDE tasks (Push, Pull, Watch, Open)
└── src/
    ├── appsscript.json     # Manifest file (scopes, Drive add-on triggers, V8 runtime)
    └── Code.gs (or Code.js)# Core business logic & CardService UI components
```

---

## 🔒 Security Note

- Never commit `.clasprc.json` (contains your Google OAuth refresh token).
- `.gitignore` is already preconfigured to protect your private credentials.
