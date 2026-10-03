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
