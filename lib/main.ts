/// <reference path="../typings/atom/atom.d.ts"/>

import fs = require("fs");
import path = require("path");

interface FunctionDescriptor{
    name: string;
    parameters: string[]
}

interface FunctionVariable{
    name: string;
}

interface AutoCompleteData{
    text: string;
    type: string;
    rightLabel?: string;
}

class Provider{
    private autocompleteFunctions: FunctionDescriptor[];
    private autocompleteVariables: FunctionVariable[];
    selector = '.source.gml';
    //disableForSelector: '.source.js .comment',
    inclusionPriority = 1;
    excludeLowerPriority = false;
    getSymbolFromPrefix<t extends {name: string}[]>(prefix: string, list: t){
        return <t>list.filter(el => {
            return el.name.slice(0, prefix.length) == prefix;
        })
    }
    getFunctionsWithPrefix(prefix: string){
        return this.getSymbolFromPrefix(prefix, this.autocompleteFunctions)
    }
    getVariablesWithPrefix(prefix: string){
        return this.getSymbolFromPrefix(prefix, this.autocompleteVariables)
    }
    getSuggestions(arg) {
        var activatedManually: boolean, bufferPosition: number, editor, prefix: string, scopeDescriptor;
        editor = arg.editor, bufferPosition = arg.bufferPosition, scopeDescriptor = arg.scopeDescriptor, prefix = arg.prefix, activatedManually = arg.activatedManually;
        console.log(prefix);
        return new Promise((resolve) => {
            console.time("concat")
            var retValue = resolve((<AutoCompleteData[]>this.getFunctionsWithPrefix(prefix).map(obDesc => ({
                text: obDesc.name,
                rightLabel: obDesc.parameters != null?"(" + obDesc.parameters.join(", ") + ")":"()",
                type: "function"
            }))).concat(this.getVariablesWithPrefix(prefix).map(obDesc => ({
                text: obDesc.name,
                type: "variable"
            }))));
            console.timeEnd("concat")
        });
    }
    onDidInsertSuggestion(arg) {
        var editor, suggestion, triggerPosition;
        editor = arg.editor, triggerPosition = arg.triggerPosition, suggestion = arg.suggestion;
    }
    dispose(){}
    constructor(){
        fs.readFile(path.resolve(__dirname, "..", "gml-functions"), (err, data) => {
            var functionDescriptors = data.toString().split("--")[1]/*Remove the copywrite*/.split(/(\r\n|\n|\r)\1/);
            this.autocompleteFunctions = functionDescriptors.map(functionDescriptor => {
                var parts = functionDescriptor.split(/\r\n|\n|\r/);
                var name = parts[0];
                var args: string[];
                if(parts[1] == undefined)
                    args = []
                else if(parts[1] == "none")
                    args = null
                else
                    var args = parts[1].split(",");
                return {
                    name: name,
                    parameters: args
                }
            })
        })
        fs.readFile(path.resolve(__dirname, "..", "gml-variables"), (err, data) => {
            this.autocompleteVariables = data.toString()
                                             .split(/\r\n|\n|\r/)
                                             .map(x => ({name: x}));
        });
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
