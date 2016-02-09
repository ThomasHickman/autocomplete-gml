"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require("fs");
const path = require("path");
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
        /**
        * file name -> a pointer to the completion data of the project file
        */
        this.cachedFiles = new Map();
        /**
        * GMX project file name -> a pointer to the completion data of that project file
        */
        this.gmxFiles = new Map();
    }
    parseGMXFile(gmxFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    searchForGMXProjectLocation(_dirPath, capPath) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    getCompletionsForFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.cachedFiles.has(filePath)) {
                throw new Error("Editor opened after autocomplete tiggered");
            }
            else {
                return yield this.cachedFiles.get(filePath);
            }
        });
    }
    noGMXFileFound() {
    }
    mulitpleGMXFilesFound(gmxFileNames) {
    }
    getGMXDataForFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            var projectFolder = findOuterProjectFolder(filePath);
            if (projectFolder == null) {
                this.noGMXFileFound();
                return [];
            }
            var gmxLoc = yield this.searchForGMXProjectLocation(path.dirname(filePath), projectFolder);
            if (gmxLoc == null) {
                this.noGMXFileFound();
                return [];
            }
            else if (gmxLoc.length > 1) {
                this.mulitpleGMXFilesFound(gmxLoc);
                return [];
            }
            if (this.gmxFiles.has(gmxLoc[0])) {
                return this.gmxFiles.get(gmxLoc[0]);
            }
            else {
                var promiseOfFile = this.parseGMXFile(gmxLoc[0]);
                this.gmxFiles.set(gmxLoc[0], promiseOfFile);
                return yield promiseOfFile;
            }
        });
    }
    cacheGMXForFile(filePath) {
        if (!this.cachedFiles.has(filePath)) {
            this.cachedFiles.set(filePath, this.getGMXDataForFile(filePath));
        }
    }
}
module.exports = GMXFileManager;
