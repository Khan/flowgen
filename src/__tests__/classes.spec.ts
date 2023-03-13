import { compiler, beautify } from "..";
import "../test-matchers";

it("should handle static methods ES6 classes", () => {
  const ts = `
  interface Subscribable<T> {}
  class Operator<T, R> {}
  class Observable<T> implements Subscribable<T> {
    create: Function;
    static create: Function;
    lift<R>(operator: Operator<T, R>): Observable<R>;
    static lift<R>(operator: Operator<T, R>): Observable<R>;
    readonly foo: number;
    static readonly bar: string;
    baz?: string;
    readonly quux?: number;
    static quick?: symbol;
    static readonly fox?: string;
    jump?(): void;
    readonly jump?(): void;
    static readonly jump?(): void;
    protected get cfnProperties(): {
      [key: string]: any;
    };
    static get fooGet(): string;
  }
  `;
  const result = compiler.compileDefinitionString(ts, { quiet: true });
  expect(beautify(result)).toMatchSnapshot();
  expect(result).toBeValidFlowTypeDeclarations();
});

it("should handle class extends", () => {
  const ts = `
  class extension {
    getString(): string
  }
  class extender extends extension {
    getNumber(): number
  }
  `;
  const result = compiler.compileDefinitionString(ts, { quiet: true });
  expect(beautify(result)).toMatchSnapshot();
  expect(result).toBeValidFlowTypeDeclarations();
});

it("should handle class implements", () => {
  const ts = `
  interface implementation {
    getString(): string
  }
  class implementor implements implementation {
    getString(): string
  }
  `;
  const result = compiler.compileDefinitionString(ts, { quiet: true });
  expect(beautify(result)).toMatchSnapshot();
  expect(result).toBeValidFlowTypeDeclarations();
});

it("should handle class implements and extends", () => {
  const ts = `
  interface implementation1 {
    getString(): string
  }
  interface implementation2 {
    getNumber(): number
  }
  class extension {}
  class implementor extends extension implements implementation1, implementation2 {
    getString(): string
    getNumber(): number
  }
  `;
  const result = compiler.compileDefinitionString(ts, { quiet: true });
  expect(beautify(result)).toMatchSnapshot();
  expect(result).toBeValidFlowTypeDeclarations();
});

it("should handle class implements and extends with an imported interface", () => {
  const ts = `
  import * as React from "react";
  import type {Implementation1} from "../foo";
  type Props = {
    msg: string,
  }
  type State = {
    count: number,
  }
  export default class TooltipAnchor extends React.Component<Props, State> implements Implementation1 {
    getString(): string
  }
  `;
  const result = compiler.compileDefinitionString(ts, {
    quiet: true,
    inexact: false,
    jsdoc: true,
  });
  expect(beautify(result)).toMatchInlineSnapshot(`
    "import * as React from \\"react\\";
    import type { Implementation1 } from \\"../foo\\";
    declare type Props = {|
      msg: string,
    |};
    declare type State = {|
      count: number,
    |};
    declare export default class TooltipAnchor
      extends React.Component<Props, State>
      implements Implementation1
    {
      getString(): string;
    }
    "
  `);
  // NOTE: We don't bother calling .toBeValidFlowTypeDeclarations() because there
  // instead a way for types to be imported from other files with the way this
  // test harness is set up.
});
