/**
 * Creates folders sequentially with an in-memory cache to prevent Drive API lag.
 * Uses Advanced Drive Service (Drive API v3) for performance and includes atomic rollback.
 *
 * @param {GoogleAppsScript.Drive.Folder} rootFolder - The target Google Drive folder.
 * @param {string[]} paths - Array of normalized folder paths to create.
 * @returns {number} The number of newly created folders.
 */
function createFolderStructure(rootFolder, paths) {
  var rootId = rootFolder.getId();
  var folderCache = {
    "root": rootId,
  };
  var createdFolderIds = [];
  var createdCount = 0;

  try {
    paths.forEach(function (path) {
      var parts = path.split("/");
      var currentPathKey = "root";
      var currentParentId = rootId;

      for (var i = 0; i < parts.length; i++) {
        var folderName = parts[i];
        currentPathKey += "/" + folderName;

        // 1. Check our memory cache first
        if (folderCache[currentPathKey]) {
          currentParentId = folderCache[currentPathKey];
        } else {
          // 2. Query Google Drive API v3 to see if it exists
          // Drive API v3 uses 'name' instead of 'title' for queries
          var query = "mimeType='application/vnd.google-apps.folder' and trashed=false and name='" + folderName.replace(/'/g, "\\'") + "' and '" + currentParentId + "' in parents";
          
          var searchResult = Drive.Files.list({
            q: query,
            fields: "files(id, name)",
            pageSize: 1
          });

          if (searchResult.files && searchResult.files.length > 0) {
            currentParentId = searchResult.files[0].id;
          } else {
            // Create new folder via Advanced Service
            var newFolder = Drive.Files.create({
              name: folderName,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [currentParentId]
            });
            currentParentId = newFolder.id;
            createdFolderIds.push(currentParentId);
            createdCount++;
          }

          // 3. Save to cache for subsequent child folders
          folderCache[currentPathKey] = currentParentId;
        }
      }
    });

    return createdCount;

  } catch (error) {
    // Atomic Rollback: Delete any created folders
    for (var i = createdFolderIds.length - 1; i >= 0; i--) {
      try {
        Drive.Files.remove(createdFolderIds[i]);
      } catch (e) {
        // Ignore deletion errors during rollback to try and delete as many as possible
      }
    }
    throw new Error("Folder creation failed and changes were rolled back. Original error: " + error.message);
  }
}
