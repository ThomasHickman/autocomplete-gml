/// <reference path="../typings/atom/atom.d.ts"/>
"use strict";
var fs = require("fs");
var path = require("path");
var GMXFileManager = require("./GMXFileManager");
const GAMEMAKER_EXT = [".gml", ".gmx"];
class Provider {
    constructor() {
        this.allAutoCompleteData = [];
        this.gmxFileManager = new GMXFileManager();
        this.selector = '.source.gml';
        this.disableForSelector = '.source.gml .comment, .source.gml .string';
        this.inclusionPriority = 1;
        this.excludeLowerPriority = false;
        this.gmxLocations = [];
        fs.readFile(path.resolve(__dirname, "..", "gml-functions"), (err, data) => {
            var functionDescriptors = data.toString().split("--")[1] /*Remove the copywrite*/.split(/(\r\n|\n|\r)\1/);
            this.allAutoCompleteData = this.allAutoCompleteData.concat(functionDescriptors.map(functionDescriptor => {
                var parts = functionDescriptor.split(/\r\n|\n|\r/);
                var name = parts[0];
                var args;
                if (parts[1] == undefined)
                    args = [];
                else if (parts[1] == "none")
                    args = null;
                else
                    var args = parts[1].split(",");
                return this.parseFunctionToSuggestion(name, args);
            }));
        });
        fs.readFile(path.resolve(__dirname, "..", "gml-variables"), (err, data) => {
            this.allAutoCompleteData = this.allAutoCompleteData.concat(data.toString()
                .split(/\r\n|\n|\r/)
                .map(x => ({
                text: x,
                type: "variable"
            })));
        });
        atom.workspace.observeTextEditors(editor => {
            var filePath = editor.getPath();
            if (GAMEMAKER_EXT.some(ext => path.extname(filePath) == ext)) {
                this.gmxFileManager.cacheGMXForFile(filePath);
            }
        });
        //Read XML file of project
        //this.updateGMXProjectLocations(atom.project.rootDirectories.map(dir => dir.path))
        //atom.project.onDidChangePaths(newPaths => this.updateGMXProjectLocations(newPaths))
    }
    getSymbolFromPrefix(prefix, list) {
        return list.filter(el => {
            return el.text.slice(0, prefix.length) == prefix;
        }).map(x => Object.assign({}, x));
    }
    parseFunctionToSuggestion(name, parameters) {
        return {
            text: name,
            rightLabel: parameters != null ? "(" + parameters.join(", ") + ")" : "()",
            type: "function"
        };
    }
    getSuggestions(arg) {
        return new Promise((resolve) => {
            return resolve(this.getSymbolFromPrefix(arg.prefix, this.allAutoCompleteData
                .concat(this.gmxFileManager.getCompletionsForFile(arg.editor.getPath()))));
        });
    }
    dispose() { }
}
;
var provider;
module.exports = {
    activate: function () {
        provider = new Provider();
    },
    getProvider: function () {
        return provider;
    },
    provide: function () {
        return provider;
    }
};
//# sourceMappingURL=main.js.map