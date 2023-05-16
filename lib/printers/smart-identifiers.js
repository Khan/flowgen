"use strict";

exports.__esModule = true;
exports.getLeftMostEntityName = getLeftMostEntityName;
exports.renamesOrReplacesNode = renamesOrReplacesNode;

var ts = _interopRequireWildcard(require("typescript"));

var _checker = require("../checker");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const setImportedName = (name, type, symbol, decl) => {
  var _symbol$parent, _decl$parent, _decl$parent$parent, _decl$parent$parent$p, _decl$parent$parent$p2;

  const specifiers = ["react"];
  const namespaces = ["React"];

  const paths = name => {
    if (name === "react" || name === "React") {
      return {
        ReactNode: "Node",
        ReactElement: "Element"
      };
    }

    return {};
  }; // @ts-expect-error todo(flow->ts)


  if (namespaces.includes((_symbol$parent = symbol.parent) == null ? void 0 : _symbol$parent.escapedName)) {
    var _symbol$parent2;

    // @ts-expect-error todo(flow->ts)
    type.escapedText = paths((_symbol$parent2 = symbol.parent) == null ? void 0 : _symbol$parent2.escapedName)[name] || name;
    return true;
  } else if ( // @ts-expect-error todo(flow->ts)
  specifiers.includes((_decl$parent = decl.parent) == null ? void 0 : (_decl$parent$parent = _decl$parent.parent) == null ? void 0 : (_decl$parent$parent$p = _decl$parent$parent.parent) == null ? void 0 : (_decl$parent$parent$p2 = _decl$parent$parent$p.moduleSpecifier) == null ? void 0 : _decl$parent$parent$p2.text)) {
    type.escapedText = // @ts-expect-error todo(flow->ts)
    paths(decl.parent.parent.parent.moduleSpecifier.text)[name] || name;
    return true;
  }

  return false;
};

const setGlobalName = (type, _symbol) => {
  const globals = [{
    from: ts.createQualifiedName(ts.createIdentifier("JSX"), "Element"),
    to: ts.createIdentifier("React$Node")
  }];

  if (_checker.checker.current) {
    const bools = [];

    for (const {
      from,
      to
    } of globals) {
      if (ts.isQualifiedName(type.typeName) && compareQualifiedName(type.typeName, from)) {
        // @ts-expect-error readonly property, but we write to it
        type.typeName = to;
        bools.push(true);
      }
    }

    return bools.length > 0;
  }

  return false;
};

const eventTypes = {
  SyntheticEvent: "SyntheticEvent",
  AnimationEvent: "SyntheticAnimationEvent",
  ChangeEvent: "SyntheticInputEvent",
  CompositionEvent: "SyntheticCompositionEvent",
  ClipboardEvent: "SyntheticClipboardEvent",
  UIEvent: "SyntheticUIEvent",
  FocusEvent: "SyntheticFocusEvent",
  KeyboardEvent: "SyntheticKeyboardEvent",
  MouseEvent: "SyntheticMouseEvent",
  DragEvent: "SyntheticDragEvent",
  WheelEvent: "SyntheticWheelEvent",
  PointerEvent: "SyntheticPointerEvent",
  TouchEvent: "SyntheticTouchEvent",
  TransitionEvent: "SyntheticTransitionEvent"
};
const reactTypes = {
  ComponentProps: "ElementProps",
  FC: "StatelessFunctionalComponent"
}; // This function will either rename the node or, if it's React.ForwardedRef<T> it
// will return a new node containing the type literal {current: T | null}.

function renamesOrReplacesNode(symbol, type) {
  if (type.kind === ts.SyntaxKind.TypeReference && ts.isQualifiedName(type.typeName)) {
    const left = type.typeName.left.getText();
    const right = type.typeName.right.getText();

    if (left === "React") {
      if (right in eventTypes) {
        // React's TypeScript event types can take two type params, but
        // Flow's can only take one.
        if (type.typeArguments.length === 2) {
          // We only need the first one, so we remove the second one.
          // @ts-expect-error: typeArguments is supposed to be readonly
          type.typeArguments.pop();
        } // @ts-expect-error: typeName is supposed to be readonly


        type.typeName = ts.createIdentifier(eventTypes[right]);
        return true;
      }

      if (right in reactTypes) {
        // @ts-expect-error: typeName is supposed to be readonly
        type.typeName.right.escapedText = reactTypes[right];
        return true;
      }
    }
    /**
     * Convert React.ForwardRef<T> to {|current: T | null|}
     *
     * NOTE(kevinb): We can't output {|current: ?T|} because the TypeScript
     * AST doesn't have a nullable operator and the way Flowgen works
     * is that it operators on a TS AST and then has a printer which
     * does the final conversion to Flow syntax.
     */


    if (left === "React" && right === "ForwardedRef") {
      const typeArg = type.typeArguments[0];
      const {
        parent
      } = type;

      if (ts.isPropertySignature(parent)) {
        return ts.createTypeLiteralNode([ts.createPropertySignature([], "current", undefined, ts.createUnionTypeNode([typeArg, // @ts-expect-error: createKeywordTypeNode doesn't like being passed NullKeyword
        ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword)]))]);
      }
    }

    if (left === "React" && right === "ForwardRefExoticComponent") {
      const typeArg = type.typeArguments[0];

      if (ts.isIntersectionTypeNode(typeArg)) {
        const [props, maybeRefAttributes] = typeArg.types;

        if (ts.isTypeReferenceNode(maybeRefAttributes) && ts.isQualifiedName(maybeRefAttributes.typeName)) {
          const left = maybeRefAttributes.typeName.left.getText();
          const right = maybeRefAttributes.typeName.right.getText();

          if (left === "React" && right === "RefAttributes" && maybeRefAttributes.typeArguments) {
            const instance = maybeRefAttributes.typeArguments[0]; // @ts-expect-error: typeArguments is supposed to be readonly

            type.typeArguments = [props, instance]; // @ts-expect-error: typeName is supposed to be readonly

            type.typeName.right.escapedText = "AbstractComponent";
            return true;
          }
        }
      } else if (typeArg.kind === ts.SyntaxKind.AnyKeyword) {
        // @ts-expect-error: typeArguments is supposed to be readonly
        type.typeArguments = [ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword), ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)]; // @ts-expect-error: typeName is supposed to be readonly

        type.typeName.right.escapedText = "AbstractComponent";
        return true;
      }
    }
  }

  if (!symbol) return false;
  if (!symbol.declarations) return false;
  const decl = symbol.declarations[0];

  if (ts.isImportSpecifier(type)) {
    // @ts-expect-error todo(flow->ts)
    setImportedName(decl.name.escapedText, decl.name, symbol, decl);
  } else if (type.kind === ts.SyntaxKind.TypeReference) {
    const leftMost = getLeftMostEntityName(type.typeName);

    if (leftMost && _checker.checker.current) {
      var _leftMostSymbol$paren;

      const leftMostSymbol = _checker.checker.current.getSymbolAtLocation(leftMost);

      const isGlobal = (leftMostSymbol == null ? void 0 : (_leftMostSymbol$paren = leftMostSymbol.parent) == null ? void 0 : _leftMostSymbol$paren.escapedName) === "__global";

      if (isGlobal) {
        return setGlobalName(type, symbol);
      }
    }

    if (ts.isQualifiedName(type.typeName)) {
      const left = type.typeName.left.getText();
      const right = type.typeName.right.getText();

      if (left === "React" && right === "ReactElement") {
        if (type.typeArguments.length === 0) {
          // @ts-expect-error: typeArguments is supposed to be readonly
          type.typeArguments = [{
            kind: ts.SyntaxKind.AnyKeyword
          }];
        }
      }

      return setImportedName(symbol.escapedName, type.typeName.right, symbol, decl);
    } else {
      return setImportedName(symbol.escapedName, type.typeName, symbol, decl);
    }
  }

  return false;
}

function getLeftMostEntityName(type) {
  if (type.kind === ts.SyntaxKind.QualifiedName) {
    return type.left.kind === ts.SyntaxKind.Identifier ? type.left : getLeftMostEntityName(type.left);
  } else if (type.kind === ts.SyntaxKind.Identifier) {
    return type;
  }
}

function compareIdentifier(a, b) {
  if (a.kind !== b.kind) return false;
  if (a.escapedText === b.escapedText && a.text === b.text) return true;
  return false;
}

function compareEntityName(a, b) {
  if (a.kind === ts.SyntaxKind.Identifier && b.kind === ts.SyntaxKind.Identifier) {
    return compareIdentifier(a, b);
  }

  if (a.kind === ts.SyntaxKind.QualifiedName && b.kind === ts.SyntaxKind.QualifiedName) {
    return compareQualifiedName(a, b);
  }

  return false;
}

function compareQualifiedName(a, b) {
  return compareEntityName(a.left, b.left) && compareIdentifier(a.right, b.right);
}