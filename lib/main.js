"use strict";
var fs = require("fs");
var path = require("path");
class Provider {
    constructor() {
        this.selector = '.source.gml';
        this.inclusionPriority = 1;
        this.excludeLowerPriority = false;
        fs.readFile(path.resolve(__dirname, "..", "gml-data"), (err, data) => {
            var functionDescriptors = data.toString().slice(1761).split("\n\n");
            this.autocompleteFunctions = functionDescriptors.map(functionDescriptor => {
                var parts = functionDescriptor.split("\n");
                var name = parts[0];
                var args;
                if (parts[1] == undefined)
                    args = [];
                else if (parts[1] == "none")
                    args = null;
                else
                    var args = parts[1].split(",");
                return {
                    name: name,
                    parameters: args
                };
            });
        });
    }
    getFunctionsWithPrefix(prefix) {
        return this.autocompleteFunctions.filter(el => {
            return el.name.slice(0, prefix.length) == prefix;
        });
    }
    getSuggestions(arg) {
        var activatedManually, bufferPosition, editor, prefix, scopeDescriptor;
        editor = arg.editor, bufferPosition = arg.bufferPosition, scopeDescriptor = arg.scopeDescriptor, prefix = arg.prefix, activatedManually = arg.activatedManually;
        console.log(prefix);
        return new Promise((resolve) => {
            return resolve(this.getFunctionsWithPrefix(prefix).map(obDesc => ({
                text: obDesc.name,
                rightLabel: obDesc.parameters != null ? "(" + obDesc.parameters.join(", ") + ")" : "<unknown parameters>",
                type: "function"
            })));
        });
    }
    onDidInsertSuggestion(arg) {
        var editor, suggestion, triggerPosition;
        editor = arg.editor, triggerPosition = arg.triggerPosition, suggestion = arg.suggestion;
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
