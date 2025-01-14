"use strict";

exports.__esModule = true;
exports.variableDeclaration = exports.typeReference = exports.typeDeclaration = exports.propertyDeclaration = exports.interfaceType = exports.interfaceDeclaration = exports.enumDeclaration = exports.classDeclaration = void 0;

var ts = _interopRequireWildcard(require("typescript"));

var _options = require("../options");

var _checker = require("../checker");

var _namespace = _interopRequireDefault(require("../nodes/namespace"));

var printers = _interopRequireWildcard(require("./index"));

var _env = require("../env");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const propertyDeclaration = (node, keywordPrefix) => {
  let left = keywordPrefix;

  const symbol = _checker.checker.current.getSymbolAtLocation(node.name);

  const name = ts.isVariableDeclaration(node) ? printers.node.getFullyQualifiedName(symbol, node.name) : printers.node.printType(node.name);

  if (node.modifiers && node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword)) {
    return "";
  }

  if (node.modifiers && node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword)) {
    left += "+";
  }

  left += name;

  if (node.type) {
    let right = printers.node.printType(node.type);

    if (ts.isPropertyDeclaration(node) && node.questionToken) {
      if (node.name.kind !== ts.SyntaxKind.ComputedPropertyName) {
        left += "?";
      } else {
        right = `(${right}) | void`;
      }
    }

    return left + ": " + right;
  }

  return left + `: ${printers.node.printType(node.initializer)}\n`;
};

exports.propertyDeclaration = propertyDeclaration;

const variableDeclaration = node => {
  const declarations = node.declarationList.declarations.map(printers.node.printType);
  return declarations.map(name => `declare ${printers.relationships.exporter(node)}var ${name};`).join("\n");
};

exports.variableDeclaration = variableDeclaration;

const interfaceType = (node, nodeName, mergedNamespaceChildren, withSemicolons = false, isType = false) => {
  const isInexact = (0, _options.opts)().inexact;
  const members = node.members.map(member => {
    const printed = printers.node.printType(member);

    if (!printed) {
      return null;
    }

    return "\n" + printers.common.jsdoc(member) + printed;
  });

  if (mergedNamespaceChildren.length > 0) {
    for (const child of _namespace.default.formatChildren(mergedNamespaceChildren, nodeName)) {
      members.push(`static ${child}\n`);
    }
  }

  const hasIndexSignature = node.members.some(member => ts.isIndexSignatureDeclaration(member)); // If an index signature is present in our type, we probably don't want to
  // provide the trailing "...", since it will be ignored by Flow anyway.

  if (isType && isInexact && !hasIndexSignature) {
    members.push("...\n");
  } else if (members.length > 0) {
    members.push("\n");
  }

  const inner = members.filter(Boolean) // Filter rows which didn't print properly (private fields et al)
  .join(withSemicolons ? ";" : ","); // we only want type literals to be exact. i.e. class Foo {} should not be class Foo {||}

  if (!ts.isTypeLiteralNode(node)) {
    return `{${inner}}`;
  } // If a type contains an index signature (e.g. `[key: string]: number`), then
  // we want to treat it as inexact no matter what, otherwise we may generate a
  // Flow type like `{|[k: string]: any|}` which is invalid in Flow prior to
  // v0.126.0 (source: https://github.com/facebook/flow/blob/main/Changelog.md#01260)
  //
  // It should also be safe to assume that if an index signature is present, the
  // equivalent human-authored Flow type would be inexact.


  if (hasIndexSignature) {
    return `{${inner}}`;
  }

  return isInexact ? `{${inner}}` : `{|${inner}|}`;
};

exports.interfaceType = interfaceType;

const interfaceRecordType = (node, heritage, withSemicolons = false) => {
  const isInexact = (0, _options.opts)().inexact;
  let members = node.members.map(member => {
    const printed = printers.node.printType(member);

    if (!printed) {
      return null;
    }

    return "\n" + printers.common.jsdoc(member) + printed;
  }).filter(Boolean) // Filter rows which didnt print propely (private fields et al)
  .join(withSemicolons ? ";" : ",");

  if (members.length > 0) {
    members += "\n";
  }

  if (isInexact) {
    return `{${heritage}${members}}`;
  } else {
    return `{|${heritage}${members}|}`;
  }
};

const classHeritageClause = classHeritageTypes => (0, _env.withEnv)((env, type) => {
  env.classHeritage = true;

  const symbol = _checker.checker.current.getSymbolAtLocation(type.expression);

  printers.node.fixDefaultTypeArguments(symbol, type);

  if (ts.isIdentifier(type.expression) && symbol) {
    const value = printers.node.getFullyQualifiedPropertyAccessExpression(symbol, type.expression) + printers.common.generics(type.typeArguments);
    classHeritageTypes.push(value);
  } else {
    classHeritageTypes.push(printers.node.printType(type));
  }

  env.classHeritage = false;
});

const interfaceHeritageClause = type => {
  // TODO: refactor this
  const symbol = _checker.checker.current.getSymbolAtLocation(type.expression);

  printers.node.fixDefaultTypeArguments(symbol, type);

  if (ts.isIdentifier(type.expression) && symbol) {
    const name = printers.node.getFullyQualifiedPropertyAccessExpression(symbol, type.expression);
    return name + printers.common.generics(type.typeArguments);
  } else if (ts.isIdentifier(type.expression)) {
    const name = printers.identifiers.print(type.expression.text);

    if (typeof name === "function") {
      return name(type.typeArguments);
    } else {
      return name;
    }
  } else {
    return printers.node.printType(type);
  }
};

const interfaceRecordDeclaration = (nodeName, node, modifier) => {
  let heritage = ""; // If the class is extending something

  if (node.heritageClauses) {
    heritage = node.heritageClauses.map(clause => {
      return clause.types.map(interfaceHeritageClause).map(type => `...$Exact<${type}>`).join(",\n");
    }).join("");
    heritage = heritage.length > 0 ? `${heritage},\n` : "";
  }

  const str = `${modifier}type ${nodeName}${printers.common.generics(node.typeParameters)} = ${interfaceRecordType(node, heritage)}\n`;
  return str;
};

const interfaceDeclaration = (nodeName, node, modifier) => {
  const isRecord = (0, _options.opts)().interfaceRecords;

  if (isRecord) {
    return interfaceRecordDeclaration(nodeName, node, modifier);
  }

  let heritage = ""; // If the class is extending something

  if (node.heritageClauses) {
    heritage = node.heritageClauses.map(clause => {
      return clause.types.map(interfaceHeritageClause).join(" & ");
    }).join("");
    heritage = heritage.length > 0 ? `& ${heritage}\n` : "";
  }

  const type = node.heritageClauses ? "type" : "interface";
  const str = `${modifier}${type} ${nodeName}${printers.common.generics(node.typeParameters)} ${type === "type" ? "= " : ""}${interfaceType(node, nodeName, [], false, type === "type")} ${heritage}`;
  return str;
};

exports.interfaceDeclaration = interfaceDeclaration;

const typeDeclaration = (nodeName, node, modifier) => {
  const str = `${modifier}type ${nodeName}${printers.common.generics(node.typeParameters)} = ${printers.node.printType(node.type)};`;
  return str;
};

exports.typeDeclaration = typeDeclaration;

const enumDeclaration = (nodeName, node) => {
  const exporter = printers.relationships.exporter(node);
  let members = ""; // @ts-expect-error iterating over an iterator

  for (const [index, member] of node.members.entries()) {
    let value;

    if (typeof member.initializer !== "undefined") {
      value = printers.node.printType(member.initializer);
    } else {
      value = index;
    }

    members += `+${member.name.text}: ${value},`;
    members += `// ${value}\n`;
  }

  return `
declare ${exporter} var ${nodeName}: {|
  ${members}
|};\n`;
};

exports.enumDeclaration = enumDeclaration;

const typeReference = (node, identifier) => {
  if (ts.isQualifiedName(node.typeName)) {
    return printers.node.printType(node.typeName) + printers.common.generics(node.typeArguments);
  }

  let name = node.typeName.text;

  if (identifier) {
    const replaced = printers.identifiers.print(node.typeName.text);

    if (typeof replaced === "function") {
      return replaced(node.typeArguments);
    }

    name = replaced;
  }

  return printers.relationships.namespaceProp(name) + printers.common.generics(node.typeArguments);
};

exports.typeReference = typeReference;

const classDeclaration = (nodeName, node, mergedNamespaceChildren) => {
  let heritage = ""; // If the class is extending something

  if (node.heritageClauses) {
    const classMixins = [];
    const classImplements = [];
    node.heritageClauses.forEach(clause => {
      if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
        clause.types.forEach(classHeritageClause(classMixins));
      } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
        clause.types.forEach(classHeritageClause(classImplements));
      }
    });
    const mixinsMessage = classMixins.length > 0 ? `extends ${classMixins.join(",")}` : "";
    const classImplementsMessage = classImplements.length > 0 ? ` implements ${classImplements.join(",")}` : "";
    heritage += mixinsMessage;
    heritage += classImplementsMessage;
  }

  const str = `declare ${printers.relationships.exporter(node)}class ${nodeName}${printers.common.generics(node.typeParameters)} ${heritage} ${interfaceType(node, nodeName, mergedNamespaceChildren, true)}`;
  return str;
};

exports.classDeclaration = classDeclaration;