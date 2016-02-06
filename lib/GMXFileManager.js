"use strict";
var fs = require("fs");
var path = require("path");
function findOuterProjectFolder(filePath) {
    var projectFiles = new Set(atom.project.rootDirectories
        .filter(x => x.contains(filePath))
        .map(x => x.getPath()));
    var currentFilePath = path.dirname(filePath);
    if (projectFiles.size == 0) {
        return null;
    }
    while (projectFiles.size != 1) {
        if (projectFiles.has(currentFilePath)) {
            projectFiles.delete(currentFilePath);
        }
        currentFilePath = path.resolve(currentFilePath, "..");
    }
    return projectFiles.values().next().value;
}
class GMXFileManager {
    constructor() {
        this.cachedFiles = new Map(); //File path -> GMX Location
        this.gmxFiles = new Map(); //GMX File -> completion data
    }
    parseGMXFile(gmxFilePath) {
        var projectParts = [
            "sound",
            "sprite",
            "background",
            "path",
            "font",
            "object",
            "room"
        ];
        var data = fs.readFileSync(gmxFilePath);
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(data.toString(), "text/xml");
        return [].concat(...projectParts.map(projectPart => Array.from(xmlDoc.querySelectorAll(`assets ${projectPart}s ${projectPart}`))
            .map(x => ({
            text: path.parse(x.textContent).name,
            type: "variable",
            rightLabel: projectPart
        })))).concat(Array.from(xmlDoc.querySelectorAll("assets constants constant"))
            .map(x => ({
            text: x.attributes["name"].textContent,
            type: "constant",
            rightLabel: x.textContent
        })));
    }
    searchForGMXProjectLocation(_dirPath, capPath) {
        var normalisedCapPath = path.normalize(capPath);
        function _searchForGMXProjectLocation(dirPath) {
            var dirFilePaths = fs.readdirSync(dirPath);
            var possFileNames = [];
            for (var filePath of dirFilePaths) {
                if (path.basename(filePath) == path.basename(dirPath) + ".gmx") {
                    return [path.resolve(dirPath, filePath)];
                }
                if (path.extname(filePath) == ".gmx") {
                    possFileNames.push(path.resolve(dirPath, filePath));
                }
            }
            if (possFileNames.length != 0) {
                return possFileNames;
            }
            else if (dirPath == normalisedCapPath) {
                return null;
            }
            else {
                return _searchForGMXProjectLocation(path.resolve(dirPath, ".."));
            }
        }
        return _searchForGMXProjectLocation(_dirPath);
    }
    getCompletionsForFile(filePath) {
        if (!this.cachedFiles.has(filePath)) {
            throw new Error("Completions for file requested before GMX File requested");
        }
        return this.gmxFiles.get(this.cachedFiles.get(filePath));
    }
    noGMXFileFound() {
        atom.notifications.addWarning("No GMX project file found for this file", {
            detail: "Set the GMX project file via the shortcut CTRL-(Add later)" +
                " or add a GMX file to the project path and reload the project"
        });
    }
    mulitpleGMXFilesFound(gmxFileNames) {
        atom.notifications.addWarning("Multiple GMX project files found for this file", {
            detail: "Set the GMX project file via the shortcut CTRL-(Add later)" +
                " or move GMX files in the project path and reload the project"
        });
    }
    cacheGMXForFile(filePath) {
        var projectFolder = findOuterProjectFolder(filePath);
        if (projectFolder == null) {
            this.noGMXFileFound();
        }
        if (!this.cachedFiles.has(filePath)) {
            var gmxLoc = this.searchForGMXProjectLocation(path.dirname(filePath), projectFolder);
            if (gmxLoc == null) {
                this.noGMXFileFound();
            }
            else if (gmxLoc.length > 1) {
                this.mulitpleGMXFilesFound(projectFolder);
            }
            this.cachedFiles.set(filePath, gmxLoc[0]);
            if (!this.gmxFiles.has(gmxLoc[0])) {
                this.gmxFiles.set(gmxLoc[0], this.parseGMXFile(gmxLoc[0]));
            }
        }
    }
}
module.exports = GMXFileManager;
//# sourceMappingURL=GMXFileManager.js.map