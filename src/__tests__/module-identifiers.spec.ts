import { compiler, beautify } from "..";
import "../test-matchers";

it("should handle react types", () => {
  const ts = `
import type {ReactNode, ReactElement} from 'react'
import * as React from 'react'
declare function s(node: ReactNode): void;
declare function s(node: React.ReactNode): void;
declare function s(node: React.ReactElement): void;
declare function s(node: ReactElement<'div'>): void;
declare function s(node: React.ReactElement<'div'>): void;
`;
  const result = compiler.compileDefinitionString(ts, { quiet: true });
  expect(beautify(result)).toMatchSnapshot();
  expect(result).toBeValidFlowTypeDeclarations();
});

it("should handle react event types", () => {
  const ts = `
import * as React from 'react'
declare function s(event: React.MouseEvent): void;
declare function s(event: React.TouchEvent): void;
declare function s(event: React.KeyboardEvent): void;
declare function s(event: React.FocusEvent): void;
declare function s(event: React.ChangeEvent): void;
declare function s(event: React.SyntheticEvent): void;
`;
  const result = compiler.compileDefinitionString(ts, { quiet: true });
  expect(beautify(result)).toMatchInlineSnapshot(`
    "import * as React from \\"react\\";
    declare function s(event: SyntheticMouseEvent<>): void;
    declare function s(event: SyntheticTouchEvent<>): void;
    declare function s(event: SyntheticKeyboardEvent<>): void;
    declare function s(event: SyntheticFocusEvent<>): void;
    declare function s(event: SyntheticInputEvent<>): void;
    declare function s(event: SyntheticEvent<>): void;
    "
  `);
  expect(result).toBeValidFlowTypeDeclarations();
});

it("should handle other react types", () => {
  const ts = `
import * as React from 'react'
class MyComponent extends React.Component<{}> {}
declare const FuncComp: React.FC<Props>;
declare type Props = React.ComponentProps<typeof MyComponent>;
`;
  const result = compiler.compileDefinitionString(ts, { quiet: true });
  expect(beautify(result)).toMatchInlineSnapshot(`
    "import * as React from \\"react\\";
    declare class MyComponent extends React.Component<{ ... }> {}
    declare var FuncComp: React.StatelessFunctionalComponent<Props>;
    declare type Props = React.ElementProps<typeof MyComponent>;
    "
  `);
  expect(result).toBeValidFlowTypeDeclarations();
});

describe("should handle global types", () => {
  test("jsx", () => {
    const ts = `
import * as React from 'react'
declare function s(node: JSX.Element): void;

type Props = {children: JSX.Element}

declare class Component extends React.Component<Props> {
  render(): JSX.Element
}
`;
    const result = compiler.compileDefinitionString(ts, { quiet: true });
    expect(beautify(result)).toMatchSnapshot();
    expect(result).toBeValidFlowTypeDeclarations();
  });
});
