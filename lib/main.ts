/// <reference path="../typings/atom/atom.d.ts"/>

import fs = require("fs");
import path = require("path");

interface AutoCompleteData{
    text: string;
    type: string;
    rightLabel?: string;
}

class Provider{
    private allAutoCompleteData = <AutoCompleteData[]>[];
    selector = '.source.gml';
    disableForSelector = '.source.gml .comment, .source.gml .string';
    inclusionPriority = 1;
    excludeLowerPriority = false;
    getSymbolFromPrefix(prefix: string, list: AutoCompleteData[]){
        return list.filter(el => {
            return el.text.slice(0, prefix.length) == prefix;
        }).map(x => Object.assign({}, x))
    }
    parseFunctionToSuggestion(name: string, parameters: string[]){
        return {
            text: name,
            rightLabel: parameters != null?"(" + parameters.join(", ") + ")":"()",
            type: "function"
        }
    }
    getSuggestions(arg) {
        var activatedManually: boolean, bufferPosition: number, editor, prefix: string, scopeDescriptor;
        editor = arg.editor, bufferPosition = arg.bufferPosition, scopeDescriptor = arg.scopeDescriptor, prefix = arg.prefix, activatedManually = arg.activatedManually;
        return new Promise((resolve) => {
            return resolve(this.getSymbolFromPrefix(prefix, this.allAutoCompleteData));
        });
    }
    parseGMXFile(projectPath: string):AutoCompleteData[] {
        var projectParts = [
            "sound",
            "sprite",
            "background",
            "path",
            "font",
            "object",
            "room"
        ]
        var data = fs.readFileSync(projectPath)
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
                })))
    }
    private projectPaths = new Set<string>();
    searchForGMXProjectLocation(dirPath: string){
        var pathUp = path.resolve(dirPath, "..")
        var proposedPath = path.resolve(dirPath, path.basename(dirPath) + ".gmx")
        if(fs.exists(proposedPath)){
            return proposedPath
        }
        else if(pathUp == path.normalize(dirPath)){
            return null
        }
        else{
            return this.searchForGMXProjectLocation(pathUp)
        }
    }
    updateGMXProjectLocations(newPaths: string[]){
        newPaths.forEach(newPath => {
            if(!this.projectPaths.has(newPath)){
                var gmxLoc = this.searchForGMXProjectLocation(newPath);
                if(gmxLoc != null){
                    this.projectPaths.add(gmxLoc)
                }
            }
        })
    }
    dispose(){}
    constructor(){
        fs.readFile(path.resolve(__dirname, "..", "gml-functions"), (err, data) => {
            var functionDescriptors = data.toString().split("--")[1]/*Remove the copywrite*/.split(/(\r\n|\n|\r)\1/);
            this.allAutoCompleteData = this.allAutoCompleteData.concat(
                functionDescriptors.map(functionDescriptor => {
                var parts = functionDescriptor.split(/\r\n|\n|\r/);
                var name = parts[0];
                var args: string[];
                if(parts[1] == undefined)
                    args = []
                else if(parts[1] == "none")
                    args = null
                else
                    var args = parts[1].split(",");
                return this.parseFunctionToSuggestion(name, args)
            }))
        })
        fs.readFile(path.resolve(__dirname, "..", "gml-variables"), (err, data) => {
            this.allAutoCompleteData = this.allAutoCompleteData.concat(
                                            data.toString()
                                            .split(/\r\n|\n|\r/)
                                            .map(x => ({
                                                text: x,
                                                type: "variable"
                                            })))
        });
        this.allAutoCompleteData =
            this.allAutoCompleteData.concat(this.parseGMXFile("test/test.project.gmx"))

        //Read XML file of project
        //this.updateGMXProjectLocations(atom.project.rootDirectories.map(dir => dir.path))
        //atom.project.onDidChangePaths(newPaths => this.updateGMXProjectLocations(newPaths))
    }
};


var provider: Provider;
module.exports = {
    activate: function() {
        provider = new Provider();
    },
    getProvider: function() {
        return provider
    },
    provide: function(){
        return provider
    }
}
