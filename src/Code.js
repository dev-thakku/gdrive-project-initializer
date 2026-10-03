/**
 * Core Data: Default Templates
 */
function getDefaultTemplates() {
  return {
    "SDLC Standard": [
      "01_Plan&Schedule",
      "02_Requirements&Spec",
      "03_Basic Design",
      "04_Detailed Design",
      "04_Detailed Design/Database",
      "04_Detailed Design/API",
      "05_Source_Code",
      "06_Test",
      "07_Release",
      "10_Report",
      "11_Issue&Question",
      "12_Manual",
      "80_Tools",
      "98_Reference",
      "99_Temporary",
    ],
    "Agile Sprint": [
      "01_Sprint_Backlog",
      "02_Design_Assets",
      "03_Development/GUI",
      "03_Development/Server",
      "04_QA_Testing",
      "05_Retrospective",
    ],
    "Marketing Campaign": [
      "01_Brief_and_Strategy",
      "02_Assets",
      "02_Assets/Images",
      "02_Assets/Video",
      "03_Copywriting",
      "04_Performance_Metrics",
    ],
  };
}

/**
 * Core Data: Fetch user-saved templates
 */
function getUserTemplates() {
  var props = PropertiesService.getUserProperties();
  var saved = props.getProperty("customTemplates");
  return saved ? JSON.parse(saved) : {};
}

/**
 * Non-Contextual Homepage
 */
function onHomepage(e) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Project Initializer V2"))
    .addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText(
          "Please select a single folder in your Google Drive to initialize a project structure.",
        ),
      ),
    )
    .build();
}

/**
 * Contextual Trigger: User selects a folder in Drive
 */
function onItemsSelected(e) {
  var selectedItems = e.drive.selectedItems;

  if (
    selectedItems.length !== 1 ||
    selectedItems[0].mimeType !== "application/vnd.google-apps.folder"
  ) {
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle("Invalid Selection"))
      .addSection(
        CardService.newCardSection().addWidget(
          CardService.newTextParagraph().setText(
            "Please select exactly one folder.",
          ),
        ),
      )
      .build();
  }

  var folderId = selectedItems[0].id;
  var folderTitle = selectedItems[0].title;
  var defaultTemplateName = "SDLC Standard";

  return buildMainCard(folderId, folderTitle, defaultTemplateName);
}

/**
 * UI Builder: Main Interface
 */
function buildMainCard(folderId, folderTitle, selectedTemplateName) {
  var allTemplates = Object.assign(
    {},
    getDefaultTemplates(),
    getUserTemplates(),
  );

  // 1. Dropdown Selection
  var dropdown = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setTitle("Select Configuration Profile")
    .setFieldName("selectedTemplate")
    .setOnChangeAction(
      CardService.newAction()
        .setFunctionName("handleTemplateChange")
        .setParameters({ folderId: folderId, folderTitle: folderTitle }),
    );

  for (var tName in allTemplates) {
    dropdown.addItem(tName, tName, tName === selectedTemplateName);
  }

  // 2. Granular Checkboxes & Structure Preview
  var checkboxGroup = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setTitle("Folder Structure Preview (Uncheck to exclude)")
    .setFieldName("folderCheckboxes");

  var paths = allTemplates[selectedTemplateName] || [];
  paths.forEach(function (path) {
    // Visually format nested paths for the preview UI
    var depth = (path.match(/\//g) || []).length;
    var indent = Array(depth + 1).join("   └─ ");
    var folderName = path.split("/").pop();
    var displayLabel = depth > 0 ? indent + folderName : "📁 " + folderName;

    checkboxGroup.addItem(displayLabel, path, true);
  });

  // 3. Actions Section
  var actionSection = CardService.newCardSection()
    .addWidget(
      CardService.newTextButton()
        .setText("Generate Selected Folders")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName("generateFolders")
            .setParameters({ folderId: folderId }),
        ),
    )
    .addWidget(
      CardService.newTextButton()
        .setText("+ Create Custom Profile")
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName("buildCustomTemplateCard")
            .setParameters({ folderId: folderId, folderTitle: folderTitle }),
        ),
    );

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Target: " + folderTitle))
    .addSection(
      CardService.newCardSection().addWidget(dropdown).addWidget(checkboxGroup),
    )
    .addSection(actionSection)
    .build();
}

/**
 * State Management: Refresh card on dropdown change
 */
function handleTemplateChange(e) {
  var folderId = e.parameters.folderId;
  var folderTitle = e.parameters.folderTitle;
  var newTemplateName = e.formInput.selectedTemplate;

  var updatedCard = buildMainCard(folderId, folderTitle, newTemplateName);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(updatedCard))
    .build();
}

/**
 * Execution Logic: Nested Folder Generation
 */
function generateFolders(e) {
  try {
    var folderId = e.parameters.folderId;
    var rootFolder = DriveApp.getFolderById(folderId);

    // Safely extract the array of checked items using e.formInputs (plural)
    var selectedPaths =
      e.formInputs && e.formInputs.folderCheckboxes
        ? e.formInputs.folderCheckboxes
        : e.formInput.folderCheckboxes
          ? [e.formInput.folderCheckboxes]
          : [];

    if (!selectedPaths || selectedPaths.length === 0) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText("Error: No folders selected."),
        )
        .build();
    }

    // Sort paths alphabetically so parent folders are always processed before their subfolders
    selectedPaths.sort();

    // In-memory cache to prevent Google Drive API index lag
    var folderCache = {
      root: rootFolder,
    };

    selectedPaths.forEach(function (path) {
      var parts = path.split("/");
      var currentPathKey = "root";
      var currentFolder = rootFolder;

      for (var i = 0; i < parts.length; i++) {
        var folderName = parts[i];
        currentPathKey += "/" + folderName;

        // 1. Check our lightning-fast memory cache first
        if (folderCache[currentPathKey]) {
          currentFolder = folderCache[currentPathKey];
        } else {
          // 2. Only query Google Drive if it's not in the cache
          var existingFolders = currentFolder.getFoldersByName(folderName);

          if (existingFolders.hasNext()) {
            currentFolder = existingFolders.next();
          } else {
            currentFolder = currentFolder.createFolder(folderName);
          }

          // 3. Save to cache for subsequent child folders
          folderCache[currentPathKey] = currentFolder;
        }
      }
    });

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          "Success! " + selectedPaths.length + " folders generated.",
        ),
      )
      .build();
  } catch (error) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          "Generation Failed: " + error.message,
        ),
      )
      .build();
  }
}

/**
 * UI Builder: Custom Template Creator Card
 */
function buildCustomTemplateCard(e) {
  var folderId = e.parameters.folderId;
  var folderTitle = e.parameters.folderTitle;

  var section = CardService.newCardSection()
    .addWidget(
      CardService.newTextInput()
        .setFieldName("templateName")
        .setTitle("Profile Name"),
    )
    .addWidget(
      CardService.newTextInput()
        .setFieldName("templatePaths")
        .setTitle("Folder Paths (One per line). Use '/' for subfolders.")
        .setMultiline(true),
    )
    .addWidget(
      CardService.newTextButton()
        .setText("Save & Apply")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName("saveCustomTemplate")
            .setParameters({ folderId: folderId, folderTitle: folderTitle }),
        ),
    );

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("New Custom Profile"))
    .addSection(section)
    .build();
}

/**
 * State Management: Save new template to PropertiesService
 */
function saveCustomTemplate(e) {
  var name = e.formInput.templateName;
  var pathsRaw = e.formInput.templatePaths;

  if (!name || !pathsRaw) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          "Error: Name and paths are required.",
        ),
      )
      .build();
  }

  // Parse multiline input into array, cleaning up whitespace
  var pathsArray = pathsRaw
    .split("\n")
    .map(function (p) {
      return p.trim();
    })
    .filter(function (p) {
      return p.length > 0;
    });

  var props = PropertiesService.getUserProperties();
  var currentTemplates = getUserTemplates();
  currentTemplates[name] = pathsArray;
  props.setProperty("customTemplates", JSON.stringify(currentTemplates));

  // Navigate back to the main card with the new template selected
  var mainCard = buildMainCard(
    e.parameters.folderId,
    e.parameters.folderTitle,
    name,
  );
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(mainCard))
    .setNotification(
      CardService.newNotification().setText("Profile saved successfully."),
    )
    .build();
}
