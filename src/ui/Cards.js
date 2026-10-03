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
