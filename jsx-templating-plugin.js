var handler = function (compileStep) {
  var source = compileStep.read().toString('utf8');
  var parts = source.split(/<template name="(\w+)">/i);
  var jsx = "\nvar Template = Template || {};\n";
  var extras = parts[0];
  for(var i=1; i <= parts.length-1; i+=2) {
    var className = parts[i];
    jsx += "Template." + className + " = {\n";
    jsx += "  onCreated: function(f) {return this._onCreated = f || (this._onCreated || function(){})},\n";
    jsx += "  helpers: function(o) {return this._helpers = o || (this._helpers || {})},\n";
    jsx += "};\n";
  }
  for(var i=1; i <= parts.length-1; i+=2) {
    var className = parts[i];
    // Split out the trailing end after the template.
    var code = parts[i+1].split(/<\/template>/i);

    // Fix that annoying issue with React, and allow usage of class.
    var markup = (code[0] || '').trim().replace(/\sclass=/g, ' className=');
    jsx += className + " = React.createClass({displayName: \"" + className + "\",\n";
    jsx += "  _created: false,\n";
    jsx += "  mixins: [ReactMeteorData],\n";
    jsx += "  getMeteorData() {\n";
    jsx += "    let self = this;\n";
    jsx += "    if (!self._created) {\n";
    jsx += "      Tracker.nonreactive(function(){Template." + className + ".onCreated().call(self)});\n";
    jsx += "      self._created = true;\n";
    jsx += "    }\n";
    jsx += "    let _helpers = {};\n";
    jsx += "    let helpers = Template." + className + ".helpers();\n";
    jsx += "    for (let key in helpers) {\n";
    jsx += "      _helpers[key] = helpers[key].call(self);\n";
    jsx += "    };\n";
    jsx += "    return _helpers;\n";
    jsx += "  },\n";
    jsx += "  render: function() {\n";
    jsx += "    return (" + markup + ");";
    jsx += "  }\n";
    jsx += "});\n";
    extras += (code[1] || '\n');
  }

  var outputFile = compileStep.inputPath + ".js";

  try {
    var result = Babel.transformMeteor(jsx + extras, {
      sourceMap: true,
      filename: compileStep.pathForSourceMap,
      sourceMapName: compileStep.pathForSourceMap,
      extraWhitelist: ["react"]
    });
  } catch (e) {
    if (e.loc) {
      // Babel error
      compileStep.error({
        message: e.message,
        sourcePath: compileStep.inputPath,
        line: e.loc.line,
        column: e.loc.column
      });
      return;
    } else {
      throw e;
    }
  }

  compileStep.addJavaScript({
    path: outputFile,
    sourcePath: compileStep.inputPath,
    data: result.code,
    sourceMap: JSON.stringify(result.map)
  });
};

Plugin.registerSourceHandler('html.jsx', handler);
