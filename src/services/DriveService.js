/**
 * Creates folders sequentially with an in-memory cache to prevent Drive API lag.
 *
 * @param {GoogleAppsScript.Drive.Folder} rootFolder - The target Google Drive folder.
 * @param {string[]} paths - Array of normalized folder paths to create.
 * @returns {number} The number of newly created folders.
 */
function createFolderStructure(rootFolder, paths) {
  var folderCache = {
    root: rootFolder,
  };
  var createdCount = 0;

  paths.forEach(function (path) {
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

  return createdCount;
}
