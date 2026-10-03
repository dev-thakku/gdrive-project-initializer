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

    // Call our DriveService to create folders
    var createdCount = createFolderStructure(rootFolder, selectedPaths);

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
