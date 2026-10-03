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
