import fs = require("fs");
import path = require("path");
import GMXFileManager = require("./GMXFileManager");

const GAMEMAKER_EXT = [".gml", ".gmx"]

class Provider{
    private allAutoCompleteData = <AutoCompleteData[]>[];
    gmxFileManager = new GMXFileManager();
    selector = '.source.gml';
    disableForSelector = '.source.gml .comment, .source.gml .string';
    inclusionPriority = 1;
    excludeLowerPriority = false;
    gmxLocations = <string[]>[];
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
    private static lastMethodNameRegExp = /[a-z_](?:[a-z_]|\d)*$/i;
    async getSuggestions(arg: {
        editor: AtomCore.IEditor;
        activatedManually: boolean;
        scopeDescriptor: string;
        bufferPosition: number;
        prefix: string;
    }){
        var gmxCompletions = await this.gmxFileManager.getCompletionsForFile(arg.editor.getPath());
        var regExpResult = Provider.lastMethodNameRegExp.exec(arg.prefix);
        var lastMethodName: string;
        if(regExpResult == null)
            lastMethodName = "";
        else
            lastMethodName = regExpResult[0];

        return this.getSymbolFromPrefix(lastMethodName, this.allAutoCompleteData.concat(gmxCompletions));
    }
    dispose(){}

    constructor(){
        fs.readFile(path.resolve(__dirname, "..", "gml-functions"), (err, data) => {
            if(data === undefined){
                throw err;
            }

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
            if(data === undefined){
                throw err;
            }

            this.allAutoCompleteData = this.allAutoCompleteData.concat(
                                            data.toString()
                                            .split(/\r\n|\n|\r/)
                                            .map(x => ({
                                                text: x,
                                                type: "variable"
                                            })))
        });

        atom.workspace.observeTextEditors((editor: AtomCore.IEditor) => {
            var filePath = editor.getPath();
            if(GAMEMAKER_EXT.some(ext => path.extname(filePath) == ext)){
                this.gmxFileManager.cacheGMXForFile(filePath)
            }
        });

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
