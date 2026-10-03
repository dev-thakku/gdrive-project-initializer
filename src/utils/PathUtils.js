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
