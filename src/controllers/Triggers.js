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
