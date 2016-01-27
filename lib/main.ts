/// <reference path="../typings/atom/atom.d.ts"/>

import fs = require("fs");
import path = require("path");

interface ObjectDescriptor{
    name: string;
    parameters: string[]
}


class Provider{
    private autocompleteFunctions: ObjectDescriptor[];
    selector = '.source.gml';
    //disableForSelector: '.source.js .comment',
    inclusionPriority = 1;
    excludeLowerPriority = false;
    getFunctionsWithPrefix(prefix: string){
        return this.autocompleteFunctions.filter(el => {
            return el.name.slice(0, prefix.length) == prefix;
        })
    }
    getSuggestions(arg) {
        var activatedManually: boolean, bufferPosition: number, editor, prefix: string, scopeDescriptor;
        editor = arg.editor, bufferPosition = arg.bufferPosition, scopeDescriptor = arg.scopeDescriptor, prefix = arg.prefix, activatedManually = arg.activatedManually;
        console.log(prefix);
        return new Promise((resolve) => {
            return resolve(this.getFunctionsWithPrefix(prefix).map(obDesc => ({
                text: obDesc.name,
                rightLabel: obDesc.parameters != null?"(" + obDesc.parameters.join(", ") + ")":"<unknown parameters>",
                type: "function"
            })));
        });
    }
    onDidInsertSuggestion(arg) {
        var editor, suggestion, triggerPosition;
        editor = arg.editor, triggerPosition = arg.triggerPosition, suggestion = arg.suggestion;
    }
    dispose(){}
    constructor(){
        fs.readFile(path.resolve(__dirname, "..", "gml-data"), (err, data) => {
            var functionDescriptors = data.toString().slice(1761)/*Remove the copywrite*/.split("\n\n");
            this.autocompleteFunctions = functionDescriptors.map(functionDescriptor => {
                var parts = functionDescriptor.split("\n");
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
