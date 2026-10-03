import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.js", "src/**/*.gs"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        ...globals.builtin,
        // Google Apps Script Core Services
        CardService: "readonly",
        DriveApp: "readonly",
        PropertiesService: "readonly",
        Session: "readonly",
        Utilities: "readonly",
        Logger: "readonly",
        ScriptApp: "readonly",
        UrlFetchApp: "readonly",
        GmailApp: "readonly",
        SpreadsheetApp: "readonly",
        DocumentApp: "readonly",
        CalendarApp: "readonly",
        console: "readonly",
      },
    },
    rules: {
      "no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "none",
          ignoreRestSiblings: true,
          // Avoid warning on functions invoked by Apps Script triggers/card actions
          varsIgnorePattern:
            "^(MAX_FOLDER_DEPTH|compareFolderPaths|validateFolderDepth|onHomepage|onItemsSelected|getDefaultTemplates|getUserTemplates|normalizeTemplatePaths|buildMainCard|handleTemplateChange|generateFolders|buildCustomTemplateCard|saveCustomTemplate|buildEditCustomTemplateCard|updateCustomTemplate|deleteCustomTemplate|createFolderStructure)",
        },
      ],
      "no-undef": "off",
    },
  },
];
