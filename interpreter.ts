export type Nodes = InputGate | AndGate | OrGate | NotGate | OutputGate;
export type Edges = Wire;
export type Graph = Circuit;

export class BasicGate {
    children: Wire[];
    parents: Wire[];
    label: string;
    value: boolean;
}

export class InputGate extends BasicGate {
    inputIndex: number;
}

export class OutputGate extends BasicGate {
}

export class NotGate extends BasicGate {
    get image() {
        return "not_gate.svg";
    }
}

export class AndGate extends BasicGate {
    get image() {
        return "and_gate.svg";
    }
}

export class OrGate extends BasicGate {
    get image() {
        return "or_gate.svg";
    }
    get anchorPoints() {
        return [{ x: -10, y: -10 }, { x: -10, y: 10 }, { x: 10, y: 0 }];
    }
}

export class Wire {
    source: Nodes;
    destination: Nodes;
}

export class Circuit {
    nodes: Nodes[];
}

function getTraversalOrder(circuit: Circuit): BasicGate[] {
    const visited = new Set<BasicGate>();
    const result: BasicGate[] = [];

    function helper(toVisit: BasicGate) {
        if (!visited.has(toVisit)) {
            visited.add(toVisit);
            for (const parent of toVisit.parents) {
                helper(parent.source);
            }
            result.push(toVisit);
        }
    }

    for (const node of circuit.nodes) {
        helper(node);
    }

    return result;
}

function easyReduce<T, R>(arr: T[], func: (current: T, result: R) => R, initial: R) {
    let result = initial;
    for (const ele of arr) {
        result = func(ele, result);
    }
    return result;
}

export class State {
    message: string;

    constructor(public toVisit: Nodes[], public output: Map<OutputGate, boolean>,  public active: Nodes) {
        if (toVisit.length > 0) {
            this.message = toVisit.map((n) => n.label).join();
        } else {
            this.message = "finished";
        }
    }
}

function applyOp(node: BasicGate, op: (a: boolean, b: boolean) => boolean, init: boolean): boolean {
    return easyReduce(node.parents, (parent, current) => op(parent.source.value, current), init);
}

export function start(start: Circuit, input: Map<InputGate, boolean>): State | Map<OutputGate, boolean> {
    if (!start.nodes.find((n) => n instanceof InputGate)) {
        throw new Error("Need at least one InputGate");
    }
    if (!start.nodes.find((n) => n instanceof OutputGate)) {
        throw new Error("Need at least one OutputGate");
    }

    if (!input) {
        return new Map();
    }

    const toVisit = getTraversalOrder(start);

    while (toVisit[0] instanceof InputGate) {
        let active = toVisit.shift();
        active.value = input.get(active as InputGate);
    }

    if (toVisit.length > 0) {
        return new State(toVisit, new Map(), toVisit[0]);
    } else {
        throw new Error("Error running plugin.");
    }
}

export function step(state: State): State | Map<OutputGate, boolean> {
    if (state.toVisit.length === 0) {
        return state.output;
    } else {
        const node = state.toVisit.shift();
        let result: boolean;

        if (node instanceof AndGate) {
            result = applyOp(node, (a, b) => a && b, true);
        } else if (node instanceof OrGate) {
            result = applyOp(node, (a, b) => a || b, false);
        } else if (node instanceof NotGate) {
            result = !node.parents[0].source.value;
        } else if (node instanceof OutputGate) {
            result = node.parents[0].source.value;
            state.output.set(node, result);
        } else {
            throw new Error(`Unknown type of node: ${Object.getPrototypeOf(node)}`);
        }

        node.value = result;
        return new State(state.toVisit, new Map(state.output), node);
    }
}