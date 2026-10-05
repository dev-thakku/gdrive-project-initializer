/**
 * Retrieves the built-in default folder structure templates.
 *
 * @returns {Object.<string, string[]>} Mapping of template names to folder path arrays.
 */
function getDefaultTemplates() {
  return DEFAULT_TEMPLATES_JSON;
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
