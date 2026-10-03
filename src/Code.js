/**
 * @typedef {Object} ActionEvent
 * @property {Record<string, any>} [parameters] - Parameters passed to the callback action.
 * @property {Record<string, any>} [formInput] - Single-value inputs from form widgets.
 * @property {Record<string, any>} [formInputs] - Multi-value inputs from form widgets (e.g., checkboxes).
 * @property {GoogleAppsScript.Addons.DriveEventObject} [drive] - Drive contextual selection data.
 */

/**
 * Maximum allowed folder hierarchy depth (1 = Root, 2 = Subfolder, 3 = Nested Subfolder).
 */
var MAX_FOLDER_DEPTH = 3;

/**
 * Hierarchical path comparator: segment-by-segment comparison ensures parent
 * comes before child, and sibling folders are ordered naturally (e.g., 01_, 02_, 10_).
 *
 * @param {string} a - Path A.
 * @param {string} b - Path B.
 * @returns {number} Sort comparison result.
 */
function compareFolderPaths(a, b) {
  var aParts = a.split("/");
  var bParts = b.split("/");
  var minLen = Math.min(aParts.length, bParts.length);

  for (var i = 0; i < minLen; i++) {
    if (aParts[i] !== bParts[i]) {
      return aParts[i].localeCompare(bParts[i], undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }
  }

  return aParts.length - bParts.length;
}

/**
 * Validates an array of raw path strings against the maximum allowed folder depth.
 *
 * @param {string[]} paths - Array of path strings.
 * @returns {{isValid: boolean, error?: string}} Validation result.
 */
function validateFolderDepth(paths) {
  for (var i = 0; i < paths.length; i++) {
    var cleanPath = paths[i]
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/+/g, "/");
    var parts = cleanPath
      .split("/")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);

    if (parts.length > MAX_FOLDER_DEPTH) {
      return {
        isValid: false,
        error:
          "Error: Maximum " +
          MAX_FOLDER_DEPTH +
          " folder levels allowed. '" +
          paths[i] +
          "' has " +
          parts.length +
          " levels.",
      };
    }
  }
  return { isValid: true };
}

/**
 * Retrieves the built-in default folder structure templates.
 *
 * @returns {Object.<string, string[]>} Mapping of template names to folder path arrays.
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
      "03_Development",
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
 * Retrieves user-defined custom templates from PropertiesService.
 *
 * @returns {Object.<string, string[]>} Mapping of custom template names to folder path arrays.
 */
function getUserTemplates() {
  var props = PropertiesService.getUserProperties();
  var saved = props.getProperty("customTemplates");
  return saved ? JSON.parse(saved) : {};
}

/**
 * Normalizes, expands parent folders, and hierarchically sorts folder paths.
 * Guarantees that any subfolder has its parent folders present and ordered directly above it.
 *
 * @param {string[]} paths - Raw array of folder paths.
 * @returns {string[]} Normalized, expanded, and hierarchically ordered paths.
 */
function normalizeTemplatePaths(paths) {
  if (!paths || !Array.isArray(paths)) {
    return [];
  }

  var pathSet = {};

  paths.forEach(function (rawPath) {
    if (!rawPath) return;
    var cleanPath = rawPath
      .toString()
      .trim()
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "")
      .replace(/\/+/g, "/");

    if (!cleanPath) return;

    var parts = cleanPath.split("/");
    var current = "";
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i].trim();
      if (!seg) continue;
      current = current ? current + "/" + seg : seg;
      pathSet[current] = true;
    }
  });

  var expanded = Object.keys(pathSet);

  // Hierarchical sort: segment-by-segment comparison ensures parent comes before child,
  // and sibling folders are ordered naturally (e.g., 01_, 02_, 10_)
  expanded.sort(compareFolderPaths);

  return expanded;
}

/**
 * Non-contextual homepage trigger invoked when the add-on is opened without a file selection.
 *
 * @param {GoogleAppsScript.Addons.EventObject} [e] - Add-on event object.
 * @returns {GoogleAppsScript.Card_Service.Card} The homepage card widget prompting folder selection.
 */
function onHomepage(e) {
  var header = CardService.newCardHeader()
    .setTitle("Project Initializer")
    .setSubtitle("Organize your Google Drive folders in seconds")
    .setImageUrl(
      "https://www.gstatic.com/images/branding/productlogos/drive_2026/v1/web-48dp/logo_drive_2026_color_2x_web_48dp.png",
    )
    .setImageStyle(CardService.ImageStyle.SQUARE);

  var howItWorksSection = CardService.newCardSection()
    .setHeader("How It Works")
    .addWidget(
      CardService.newDecoratedText()
        .setTopLabel("STEP 1")
        .setText("<b>Pick a target folder</b>")
        .setBottomLabel("Click the folder in Drive that you want to organize.")
        .setStartIcon(
          CardService.newIconImage().setIconUrl(
            "https://www.gstatic.com/images/icons/material/system/2x/folder_grey600_48dp.png",
          ),
        )
        .setWrapText(true),
    )
    .addWidget(
      CardService.newDecoratedText()
        .setTopLabel("STEP 2")
        .setText("<b>Choose your folder setup</b>")
        .setBottomLabel("Select a ready-made template or design your own.")
        .setStartIcon(
          CardService.newIconImage().setIconUrl(
            "https://www.gstatic.com/images/icons/material/system/2x/account_tree_grey600_48dp.png",
          ),
        )
        .setWrapText(true),
    )
    .addWidget(
      CardService.newDecoratedText()
        .setTopLabel("STEP 3")
        .setText("<b>Create all folders in 1 click</b>")
        .setBottomLabel("We'll build your entire folder structure instantly.")
        .setStartIcon(
          CardService.newIconImage().setIconUrl(
            "https://www.gstatic.com/images/icons/material/system/2x/bolt_grey600_48dp.png",
          ),
        )
        .setWrapText(true),
    );

  var templatesSection = CardService.newCardSection()
    .setHeader("Templates")
    .addWidget(
      CardService.newTextButton()
        .setText("Create Custom Template")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(
          CardService.newAction().setFunctionName("buildCustomTemplateCard"),
        ),
    )
    .addWidget(
      CardService.newTextParagraph().setText(
        "<i>Save your favorite folder structures to reuse anytime.</i>",
      ),
    );

  return CardService.newCardBuilder()
    .setHeader(header)
    .addSection(howItWorksSection)
    .addSection(templatesSection)
    .build();
}

/**
 * Contextual trigger invoked when items are selected in Google Drive.
 * Validates that exactly one folder is selected and opens the initializer interface.
 *
 * @param {GoogleAppsScript.Addons.EventObject} e - Drive contextual trigger event object.
 * @returns {GoogleAppsScript.Card_Service.Card} The main configuration card or an invalid selection card.
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
 * Constructs the primary configuration card displaying the template selector and checkbox tree preview.
 *
 * @param {string} folderId - Target Google Drive folder ID.
 * @param {string} folderTitle - Name of the selected Drive folder.
 * @param {string} selectedTemplateName - Name of the currently selected template profile.
 * @returns {GoogleAppsScript.Card_Service.Card} The constructed configuration card.
 */
function buildMainCard(folderId, folderTitle, selectedTemplateName) {
  var userTemplates = getUserTemplates();
  var allTemplates = Object.assign({}, getDefaultTemplates(), userTemplates);

  // If the selected template no longer exists, fall back to default
  if (!allTemplates[selectedTemplateName]) {
    selectedTemplateName = "SDLC Standard";
  }

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
    var isCustomProfile = Object.prototype.hasOwnProperty.call(
      userTemplates,
      tName,
    );
    var label = isCustomProfile ? tName + " (Custom)" : tName;
    dropdown.addItem(label, tName, tName === selectedTemplateName);
  }

  var rawPaths = allTemplates[selectedTemplateName] || [];
  var paths = normalizeTemplatePaths(rawPaths);
  var folderCount = paths.length;
  var previewTitle =
    "Folder Structure Preview (" +
    folderCount +
    (folderCount === 1 ? " folder)" : " folders)");

  // 2. Granular Checkboxes & Structure Preview
  var checkboxGroup = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.CHECK_BOX)
    .setTitle(previewTitle)
    .setFieldName("folderCheckboxes");

  paths.forEach(function (path) {
    // Visually format nested paths with non-breaking spaces (\u00A0) and folder emoji
    var depth = (path.match(/\//g) || []).length;
    var indent =
      "\u00A0\u00A0\u00A0\u00A0".repeat(depth) + (depth > 0 ? "└─ " : "");
    var folderName = path.split("/").pop();
    var displayLabel = indent + "📁 " + folderName;

    checkboxGroup.addItem(displayLabel, path, true);
  });

  // 3. Actions Section
  var actionSection = CardService.newCardSection().addWidget(
    CardService.newTextButton()
      .setText("Generate Selected Folders")
      .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName("generateFolders")
          .setParameters({
            folderId: folderId,
            selectedTemplate: selectedTemplateName,
          }),
      ),
  );

  var buttonSet = CardService.newButtonSet();

  // Allow editing if the selected template is a custom user profile
  if (
    Object.prototype.hasOwnProperty.call(userTemplates, selectedTemplateName)
  ) {
    buttonSet.addButton(
      CardService.newTextButton()
        .setText("✏️ Edit Profile")
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName("buildEditCustomTemplateCard")
            .setParameters({
              folderId: folderId,
              folderTitle: folderTitle,
              templateName: selectedTemplateName,
            }),
        ),
    );
  }

  buttonSet.addButton(
    CardService.newTextButton()
      .setText("+ New Profile")
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName("buildCustomTemplateCard")
          .setParameters({ folderId: folderId, folderTitle: folderTitle }),
      ),
  );

  actionSection.addWidget(buttonSet);

  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader()
        .setTitle(folderTitle)
        .setSubtitle("Google Drive Destination")
        .setImageStyle(CardService.ImageStyle.SQUARE)
        .setImageUrl(
          "https://www.gstatic.com/images/icons/material/system/2x/folder_grey600_48dp.png",
        ),
    )
    .addSection(
      CardService.newCardSection().addWidget(dropdown).addWidget(checkboxGroup),
    )
    .addSection(actionSection)
    .build();
}

/**
 * Action handler invoked when the template dropdown selection changes.
 * Updates the card with the folder structure corresponding to the chosen profile.
 *
 * @param {ActionEvent} e - Action event containing parameters and selected form inputs.
 * @returns {GoogleAppsScript.Card_Service.ActionResponse} Navigation action response updating the card.
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
 * Action handler that creates the selected folder hierarchy within the target Drive folder.
 * Utilizes an in-memory cache to prevent redundant Drive API lookups.
 *
 * @param {ActionEvent} e - Action event containing selected checkboxes and parameters.
 * @returns {GoogleAppsScript.Card_Service.ActionResponse} Notification response indicating success or failure.
 */
function generateFolders(e) {
  try {
    var folderId = e.parameters.folderId;
    var selectedTemplateName = e.parameters.selectedTemplate;
    var rootFolder = DriveApp.getFolderById(folderId);

    // Safely extract the array of checked items using e.formInputs (plural)
    var rawSelected =
      e.formInputs && e.formInputs.folderCheckboxes
        ? e.formInputs.folderCheckboxes
        : e.formInput && e.formInput.folderCheckboxes
          ? [e.formInput.folderCheckboxes]
          : [];

    if (!rawSelected || rawSelected.length === 0) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText("Error: No folders selected."),
        )
        .build();
    }

    // Build sets to respect unchecked ancestor folders
    var allTemplates = Object.assign(
      {},
      getDefaultTemplates(),
      getUserTemplates(),
    );
    var offeredPaths = normalizeTemplatePaths(
      allTemplates[selectedTemplateName] || [],
    );
    var offeredSet = {};
    offeredPaths.forEach(function (p) {
      offeredSet[p] = true;
    });

    var selectedSet = {};
    rawSelected.forEach(function (p) {
      selectedSet[p] = true;
    });

    // Prune any child paths whose parent/ancestor was offered but explicitly unchecked
    var selectedPaths = [];
    rawSelected.forEach(function (path) {
      var parts = path.split("/");
      var ancestorExcluded = false;
      var accumulated = "";

      for (var i = 0; i < parts.length - 1; i++) {
        accumulated = accumulated ? accumulated + "/" + parts[i] : parts[i];
        if (offeredSet[accumulated] && !selectedSet[accumulated]) {
          ancestorExcluded = true;
          break;
        }
      }

      if (!ancestorExcluded) {
        selectedPaths.push(path);
      }
    });

    if (selectedPaths.length === 0) {
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText(
            "Notice: All selected folders were excluded because their parent folders were unchecked.",
          ),
        )
        .build();
    }

    // Sort paths hierarchically so parent folders are always processed before their subfolders
    selectedPaths.sort(compareFolderPaths);

    // In-memory cache to prevent Google Drive API index lag
    var folderCache = {
      root: rootFolder,
    };
    var createdCount = 0;

    selectedPaths.forEach(function (path) {
      var parts = path.split("/");
      var currentPathKey = "root";
      var currentFolder = rootFolder;

      for (var i = 0; i < parts.length; i++) {
        var folderName = parts[i];
        currentPathKey += "/" + folderName;

        // 1. Check our memory cache first
        if (folderCache[currentPathKey]) {
          currentFolder = folderCache[currentPathKey];
        } else {
          // 2. Only query Google Drive if it's not in the cache
          var existingFolders = currentFolder.getFoldersByName(folderName);

          if (existingFolders.hasNext()) {
            currentFolder = existingFolders.next();
          } else {
            currentFolder = currentFolder.createFolder(folderName);
            createdCount++;
          }

          // 3. Save to cache for subsequent child folders
          folderCache[currentPathKey] = currentFolder;
        }
      }
    });

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          "Success! " +
            selectedPaths.length +
            " folders generated (" +
            createdCount +
            " newly created).",
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
 * Constructs the card interface for creating and saving a custom template profile.
 *
 * @param {ActionEvent} [e] - Action event containing optional folderId and folderTitle parameters.
 * @returns {GoogleAppsScript.Card_Service.Card} The custom profile creation card.
 */
function buildCustomTemplateCard(e) {
  var folderId = (e && e.parameters && e.parameters.folderId) || "";
  var folderTitle = (e && e.parameters && e.parameters.folderTitle) || "";

  var saveAction =
    CardService.newAction().setFunctionName("saveCustomTemplate");
  if (folderId) {
    saveAction.setParameters({ folderId: folderId, folderTitle: folderTitle });
  }

  var section = CardService.newCardSection()
    .addWidget(
      CardService.newTextInput()
        .setFieldName("templateName")
        .setTitle("Template Name"),
    )
    .addWidget(
      CardService.newTextInput()
        .setFieldName("templatePaths")
        .setTitle(
          "Folder Names (One per line). Max 3 levels, use '/' for subfolders.",
        )
        .setMultiline(true),
    )
    .addWidget(
      CardService.newTextButton()
        .setText(folderId ? "Save & Apply" : "Save Template")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(saveAction),
    );

  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("New Custom Template"))
    .addSection(section)
    .build();
}

/**
 * Action handler that validates, normalizes, and persists a new custom profile to UserProperties.
 * Updates the view back to the main card (if folder selected) or homepage.
 *
 * @param {ActionEvent} e - Action event containing form inputs and parameters.
 * @returns {GoogleAppsScript.Card_Service.ActionResponse} Action response navigating back to the appropriate card.
 */
function saveCustomTemplate(e) {
  var name = e.formInput.templateName ? e.formInput.templateName.trim() : "";
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

  // Prevent overwriting built-in default templates
  var defaultTemplates = getDefaultTemplates();
  if (defaultTemplates[name]) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          "Error: Cannot overwrite default template '" + name + "'.",
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

  // Enforce maximum 3 levels depth limit
  var depthCheck = validateFolderDepth(pathsArray);
  if (!depthCheck.isValid) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(depthCheck.error))
      .build();
  }

  var normalizedPaths = normalizeTemplatePaths(pathsArray);

  if (normalizedPaths.length === 0) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          "Error: At least one valid folder path is required.",
        ),
      )
      .build();
  }

  var props = PropertiesService.getUserProperties();
  var currentTemplates = getUserTemplates();
  currentTemplates[name] = normalizedPaths;
  props.setProperty("customTemplates", JSON.stringify(currentTemplates));

  if (e.parameters && e.parameters.folderId) {
    var mainCard = buildMainCard(
      e.parameters.folderId,
      e.parameters.folderTitle,
      name,
    );
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(mainCard))
      .setNotification(
        CardService.newNotification().setText("Template saved successfully."),
      )
      .build();
  }

  var homeCard = onHomepage();
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(homeCard))
    .setNotification(
      CardService.newNotification().setText("Template saved successfully."),
    )
    .build();
}

/**
 * Constructs the card interface for editing an existing custom template profile.
 * Pre-populates the fields with the profile's current name and folder paths.
 *
 * @param {ActionEvent} e - Action event containing folderId, folderTitle, and templateName parameters.
 * @returns {GoogleAppsScript.Card_Service.Card} The custom profile editing card.
 */
function buildEditCustomTemplateCard(e) {
  var folderId = e.parameters.folderId;
  var folderTitle = e.parameters.folderTitle;
  var templateName = e.parameters.templateName;

  var userTemplates = getUserTemplates();
  var existingPaths = userTemplates[templateName] || [];
  var pathsText = existingPaths.join("\n");

  var section = CardService.newCardSection()
    .addWidget(
      CardService.newTextInput()
        .setFieldName("templateName")
        .setTitle("Profile Name")
        .setValue(templateName),
    )
    .addWidget(
      CardService.newTextInput()
        .setFieldName("templatePaths")
        .setTitle(
          "Folder Paths (One per line). Max 3 levels, use '/' for subfolders.",
        )
        .setMultiline(true)
        .setValue(pathsText),
    )
    .addWidget(
      CardService.newTextButton()
        .setText("Save Changes")
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName("updateCustomTemplate")
            .setParameters({
              folderId: folderId,
              folderTitle: folderTitle,
              originalName: templateName,
            }),
        ),
    )
    .addWidget(
      CardService.newTextButton()
        .setText("🗑️ Delete Profile")
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName("deleteCustomTemplate")
            .setParameters({
              folderId: folderId,
              folderTitle: folderTitle,
              templateName: templateName,
            }),
        ),
    );

  return CardService.newCardBuilder()
    .setHeader(
      CardService.newCardHeader().setTitle("Edit Profile: " + templateName),
    )
    .addSection(section)
    .build();
}

/**
 * Action handler that validates, updates, and saves an existing custom profile.
 * Supports renaming the profile and updates UserProperties accordingly.
 *
 * @param {ActionEvent} e - Action event containing form inputs, originalName, and folder parameters.
 * @returns {GoogleAppsScript.Card_Service.ActionResponse} Navigation response updating to the main card.
 */
function updateCustomTemplate(e) {
  var originalName = e.parameters.originalName;
  var newName = e.formInput.templateName ? e.formInput.templateName.trim() : "";
  var pathsRaw = e.formInput.templatePaths;

  if (!newName || !pathsRaw) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          "Error: Name and paths are required.",
        ),
      )
      .build();
  }

  // Prevent renaming to a built-in default template name
  var defaultTemplates = getDefaultTemplates();
  if (defaultTemplates[newName]) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          "Error: Cannot overwrite default template '" + newName + "'.",
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

  // Enforce maximum 3 levels depth limit
  var depthCheck = validateFolderDepth(pathsArray);
  if (!depthCheck.isValid) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(depthCheck.error))
      .build();
  }

  var normalizedPaths = normalizeTemplatePaths(pathsArray);

  if (normalizedPaths.length === 0) {
    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification().setText(
          "Error: At least one valid folder path is required.",
        ),
      )
      .build();
  }

  var props = PropertiesService.getUserProperties();
  var currentTemplates = getUserTemplates();

  // If renamed, remove the old profile entry
  if (originalName && originalName !== newName) {
    delete currentTemplates[originalName];
  }

  currentTemplates[newName] = normalizedPaths;
  props.setProperty("customTemplates", JSON.stringify(currentTemplates));

  // Navigate back to the main card with the updated template selected
  var mainCard = buildMainCard(
    e.parameters.folderId,
    e.parameters.folderTitle,
    newName,
  );
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(mainCard))
    .setNotification(
      CardService.newNotification().setText(
        "Profile '" + newName + "' updated successfully.",
      ),
    )
    .build();
}

/**
 * Action handler that deletes a custom profile from UserProperties.
 *
 * @param {ActionEvent} e - Action event containing templateName, folderId, and folderTitle parameters.
 * @returns {GoogleAppsScript.Card_Service.ActionResponse} Navigation response updating to the main card.
 */
function deleteCustomTemplate(e) {
  var templateName = e.parameters.templateName;
  var props = PropertiesService.getUserProperties();
  var currentTemplates = getUserTemplates();

  if (templateName && currentTemplates[templateName]) {
    delete currentTemplates[templateName];
    props.setProperty("customTemplates", JSON.stringify(currentTemplates));
  }

  // Navigate back to the main card with default template selected
  var mainCard = buildMainCard(
    e.parameters.folderId,
    e.parameters.folderTitle,
    "SDLC Standard",
  );
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(mainCard))
    .setNotification(
      CardService.newNotification().setText(
        "Profile '" + templateName + "' deleted.",
      ),
    )
    .build();
}
