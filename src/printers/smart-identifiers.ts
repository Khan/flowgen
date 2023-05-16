import * as ts from "typescript";
import { checker } from "../checker";

const setImportedName = (
  name: ts.__String,
  type: any,
  symbol: ts.Symbol,
  decl: ts.Declaration,
): boolean => {
  const specifiers = ["react"];
  const namespaces = ["React"];
  const paths = (name: string) => {
    if (name === "react" || name === "React") {
      return {
        ReactNode: "Node",
        ReactElement: "Element",
      };
    }
    return {};
  };
  // @ts-expect-error todo(flow->ts)
  if (namespaces.includes(symbol.parent?.escapedName)) {
    // @ts-expect-error todo(flow->ts)
    type.escapedText = paths(symbol.parent?.escapedName)[name] || name;
    return true;
  } else if (
    // @ts-expect-error todo(flow->ts)
    specifiers.includes(decl.parent?.parent?.parent?.moduleSpecifier?.text)
  ) {
    type.escapedText =
      // @ts-expect-error todo(flow->ts)
      paths(decl.parent.parent.parent.moduleSpecifier.text)[name] || name;
    return true;
  }
  return false;
};

const setGlobalName = (
  type: ts.TypeReferenceNode,
  _symbol: ts.Symbol,
): boolean => {
  const globals = [
    {
      from: ts.createQualifiedName(ts.createIdentifier("JSX"), "Element"),
      to: ts.createIdentifier("React$Node"),
    },
  ];
  if (checker.current) {
    const bools = [];
    for (const { from, to } of globals) {
      if (
        ts.isQualifiedName(type.typeName) &&
        compareQualifiedName(type.typeName, from)
      ) {
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
  TransitionEvent: "SyntheticTransitionEvent",
};

const reactTypes = {
  ComponentProps: "ElementProps",
  FC: "StatelessFunctionalComponent",
};

// This function will either rename the node or, if it's React.ForwardedRef<T> it
// will return a new node containing the type literal {current: T | null}.
export function renamesOrReplacesNode(
  symbol: ts.Symbol | void,
  type: ts.TypeReferenceNode | ts.ImportSpecifier,
): boolean | ts.Node {
  if (
    type.kind === ts.SyntaxKind.TypeReference &&
    ts.isQualifiedName(type.typeName)
  ) {
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
        }
        // @ts-expect-error: typeName is supposed to be readonly
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
      const { parent } = type;
      if (ts.isPropertySignature(parent)) {
        return ts.createTypeLiteralNode([
          ts.createPropertySignature(
            [],
            "current",
            undefined,
            ts.createUnionTypeNode([
              typeArg,
              // @ts-expect-error: createKeywordTypeNode doesn't like being passed NullKeyword
              ts.createKeywordTypeNode(ts.SyntaxKind.NullKeyword),
            ]),
          ),
        ]);
      }
    }

    if (left === "React" && right === "ForwardRefExoticComponent") {
      const typeArg = type.typeArguments[0];
      if (ts.isIntersectionTypeNode(typeArg)) {
        const [props, maybeRefAttributes] = typeArg.types;

        if (
          ts.isTypeReferenceNode(maybeRefAttributes) &&
          ts.isQualifiedName(maybeRefAttributes.typeName)
        ) {
          const left = maybeRefAttributes.typeName.left.getText();
          const right = maybeRefAttributes.typeName.right.getText();

          if (
            left === "React" &&
            right === "RefAttributes" &&
            maybeRefAttributes.typeArguments
          ) {
            const instance = maybeRefAttributes.typeArguments[0];

            // @ts-expect-error: typeArguments is supposed to be readonly
            type.typeArguments = [props, instance];

            // @ts-expect-error: typeName is supposed to be readonly
            type.typeName.right.escapedText = "AbstractComponent";
            return true;
          }
        }
      } else if (typeArg.kind === ts.SyntaxKind.AnyKeyword) {
        // @ts-expect-error: typeArguments is supposed to be readonly
        type.typeArguments = [
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
        ];

        // @ts-expect-error: typeName is supposed to be readonly
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
    if (leftMost && checker.current) {
      const leftMostSymbol = checker.current.getSymbolAtLocation(leftMost);
      const isGlobal = leftMostSymbol?.parent?.escapedName === "__global";
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
          type.typeArguments = [{ kind: ts.SyntaxKind.AnyKeyword }];
        }
      }

      return setImportedName(
        symbol.escapedName,
        type.typeName.right,
        symbol,
        decl,
      );
    } else {
      return setImportedName(symbol.escapedName, type.typeName, symbol, decl);
    }
  }
  return false;
}

export function getLeftMostEntityName(type: ts.EntityName): ts.Identifier {
  if (type.kind === ts.SyntaxKind.QualifiedName) {
    return type.left.kind === ts.SyntaxKind.Identifier
      ? type.left
      : getLeftMostEntityName(type.left);
  } else if (type.kind === ts.SyntaxKind.Identifier) {
    return type;
  }
}

function compareIdentifier(a: ts.Identifier, b: ts.Identifier): boolean {
  if (a.kind !== b.kind) return false;
  if (a.escapedText === b.escapedText && a.text === b.text) return true;
  return false;
}

function compareEntityName(a: ts.EntityName, b: ts.EntityName): boolean {
  if (
    a.kind === ts.SyntaxKind.Identifier &&
    b.kind === ts.SyntaxKind.Identifier
  ) {
    return compareIdentifier(a, b);
  }
  if (
    a.kind === ts.SyntaxKind.QualifiedName &&
    b.kind === ts.SyntaxKind.QualifiedName
  ) {
    return compareQualifiedName(a, b);
  }
  return false;
}

function compareQualifiedName(
  a: ts.QualifiedName,
  b: ts.QualifiedName,
): boolean {
  return (
    compareEntityName(a.left, b.left) && compareIdentifier(a.right, b.right)
  );
}
