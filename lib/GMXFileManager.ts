import fs = require("fs");
import path = require("path");
import atomAPI = require("atom");

function findOuterProjectFolder(filePath: string){
    var projectFiles = new Set(atom.project.rootDirectories
        .filter(x => x.contains(filePath))
        .map(x => x.getPath()));

    var currentFilePath = path.dirname(filePath)
    if(projectFiles.size == 0){
        return null
    }
    while(projectFiles.size != 1){
        if(projectFiles.has(currentFilePath)){
            projectFiles.delete(currentFilePath)
        }
        currentFilePath = path.resolve(currentFilePath, "..")
    }

    return projectFiles.values().next().value;
}


class GMXFileManager{
    /**
    * a GML file path -> the corrisponding GML project file path
    */
    private cachedGMXLocations: Map<string, Promise<string>>;
    /**
    * GMX project file path -> the completion data of that project file
    *
    * This has an initial value of {null -> []}, so invalid GMX project files have
    * no completion data
    */
    private cachedGMXCompletionData: Map<string, Promise<AutoCompleteData[]>>;

    constructor(){
        this.resetCache();
    }

    async getCompletionsForFile(filePath: string): Promise<AutoCompleteData[]>{
        if(!this.cachedGMXLocations.has(filePath)){
            throw new Error("Editor opened after autocomplete tiggered")
        }
        else{
            var GMXFileName = await this.cachedGMXLocations.get(filePath);
            return this.cachedGMXCompletionData.get(GMXFileName);
        }
    }

    cacheGMXForFile(filePath: string){
        if(!this.cachedGMXLocations.has(filePath)){
            this.cachedGMXLocations.set(filePath, this.getGMXProjectFile(filePath))
        }
    }

    private resetCache(){
        this.cachedGMXLocations = new Map();
        this.cachedGMXCompletionData = new Map();
        this.cachedGMXCompletionData.set(null, (new Promise(() => [])));
    }

    private noGMXFileFound(fileToSearch: string){
        console.warn("No GMX project file found for file: " + fileToSearch);
    }

    private mulitpleGMXFilesFound(gmxFileNames: string[], fileToSearch: string){
        console.warn("Multiple GMX project files found for file: " + fileToSearch);
        console.groupCollapsed("GMX project files found")
        gmxFileNames.forEach(fileName => console.log(fileName))
        console.groupEnd();
    }

    private async parseGMXFile(gmxFilePath: string): Promise<AutoCompleteData[]> {
        var projectParts = [
            "sound",
            "sprite",
            "background",
            "path",
            "font",
            "object",
            "room"
        ]
        var file = new atomAPI.File(gmxFilePath, false);
        var data = await file.read(false)//fs.readFileSync(gmxFilePath);
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(data.toString(), "text/xml");
        return [].concat(...projectParts.map(projectPart =>
            Array.from(xmlDoc.querySelectorAll(`assets ${projectPart}s ${projectPart}`))
                .map(x => ({
                    text: path.parse(x.textContent).name,
                    type: "variable",
                    rightLabel: projectPart
                })))).concat(Array.from(xmlDoc.querySelectorAll("assets constants constant"))
                .map(x => ({
                    text: x.attributes["name"].textContent,
                    type: "constant",
                    rightLabel: x.textContent
                }))).concat(Array.from(xmlDoc.querySelectorAll("assets scripts script"))
                .map(x => ({
                    text: path.parse(x.textContent).name,
                    type: "function",
                    rightLabel: "script"
                })))
    }

    private async searchForGMXProjectLocation(_dirPath: string, capPath: string){
        var normalisedCapPath = path.normalize(capPath)

        function _searchForGMXProjectLocation(dirPath: string): string[]{
            var dirFilePaths = fs.readdirSync(dirPath)
            var possFileNames = <string[]>[]
            for(var filePath of dirFilePaths){
                if(path.basename(filePath) == path.basename(dirPath) + ".project.gmx"){
                    return [path.resolve(dirPath, filePath)]
                }
                if(filePath.slice(filePath.length - 12) == "project.gmx"/*path.extname(filePath) == ".gmx"*/){
                    possFileNames.push(path.resolve(dirPath, filePath))
                }
            }
            if(possFileNames.length != 0){
                return possFileNames
            }
            else if(dirPath == normalisedCapPath){
                return null
            }
            else{
                return _searchForGMXProjectLocation(path.resolve(dirPath, ".."))
            }
        }
        return _searchForGMXProjectLocation(_dirPath)
    }

    private watchGMXFile(fileName: string){
        var file = new atomAPI.File(fileName, false);
        file.onDidChange(() => {
            this.cachedGMXCompletionData.set(fileName, this.parseGMXFile(fileName));
        })
        file.onDidDelete(() => {
            this.resetCache();
        })
        file.onDidRename(() => {
            this.resetCache();
        })
    }

    /**
      * Returns a promise to the file path of the GMX project file for the GML file
      * which resolves to null if no GMX project file can be found.
      *
      * This method also parses and caches the GMX project completion data into this.cachedGMXCompletionData,
      * and calls this.watchGMXFile, resulting in this.cachedGMXCompletionData updating with
      * changes to the GMX project file
      */
    private async getGMXProjectFile(filePath: string): Promise<string>{
        var projectFolder = findOuterProjectFolder(filePath);
        if(projectFolder == null){
            this.noGMXFileFound(filePath);
            return null
        }
        var gmxLoc = await this.searchForGMXProjectLocation(path.dirname(filePath), projectFolder)
        if(gmxLoc == null){
            this.noGMXFileFound(filePath)
            return null
        }
        else if(gmxLoc.length > 1){
            this.mulitpleGMXFilesFound(gmxLoc, filePath)
            return null
        }
        if(this.cachedGMXCompletionData.has(gmxLoc[0])){
            return gmxLoc[0]
        }
        else{
            this.cachedGMXCompletionData.set(gmxLoc[0], this.parseGMXFile(gmxLoc[0]));
            this.watchGMXFile(gmxLoc[0]);
            return gmxLoc[0]
        }
    }
}

export = GMXFileManager
