import { compiler, beautify } from "..";
import "../test-matchers";

describe("React types", () => {
  test("React.MouseEvent should become React.SyntheticMouseEvent", () => {
    const ts = `import * as React from "react";
declare const event: React.MouseEvent<HTMLButtonElement>;
`;

    const result = compiler.compileDefinitionString(ts);
    expect(beautify(result)).toMatchInlineSnapshot(`
      "import * as React from \\"react\\";
      declare var event: SyntheticMouseEvent<HTMLButtonElement>;
      "
    `);
    expect(result).toBeValidFlowTypeDeclarations();
  });

  test("React.ReactNode should become React.Node", () => {
    const ts = `import * as React from "react";
declare const Foo: () => React.ReactNode;
`;

    const result = compiler.compileDefinitionString(ts);
    expect(beautify(result)).toMatchInlineSnapshot(`
      "import * as React from \\"react\\";
      declare var Foo: () => React.Node;
      "
    `);
    expect(result).toBeValidFlowTypeDeclarations();
  });

  test("React.ForwardRefExoticComponent should become React.AbstractComponent", () => {
    const ts = `import * as React from "react";
type ExportProps = {msg: string};
declare const Foo: React.ForwardRefExoticComponent<ExportProps & React.RefAttributes<HTMLInputElement>>;
declare const Bar: React.ForwardRefExoticComponent<any>;
`;

    const result = compiler.compileDefinitionString(ts, { inexact: false });
    expect(beautify(result)).toMatchInlineSnapshot(`
      "import * as React from \\"react\\";
      declare type ExportProps = {|
        msg: string,
      |};
      declare var Foo: React.AbstractComponent<ExportProps, HTMLInputElement>;
      declare var Bar: React.AbstractComponent<any, any>;
      "
    `);
    expect(result).toBeValidFlowTypeDeclarations();
  });

  test("React.ForwardedRef should become React.Ref", () => {
    const ts = `type WithForwardRef = {
    forwardedRef: React.ForwardedRef<HTMLInputElement>;
};`;

    const result = compiler.compileDefinitionString(ts, { inexact: false });
    expect(beautify(result)).toMatchInlineSnapshot(`
      "declare type WithForwardRef = {|
        forwardedRef: React$Ref<HTMLInputElement>,
      |};
      "
    `);
    expect(result).toBeValidFlowTypeDeclarations();
  });
});
