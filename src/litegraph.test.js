describe("register node types", () => {
    let lg;
    let Sum;

    beforeEach(() => {
        jest.resetModules();
        lg = require("./litegraph");
        Sum = function Sum() {
            this.addInput("a", "number");
            this.addInput("b", "number");
            this.addOutput("sum", "number");
        };
        Sum.prototype.onExecute = function (a, b) {
            this.setOutputData(0, a + b);
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("normal case", () => {
        lg.LiteGraph.registerNodeType("math/sum", Sum);

        let node = lg.LiteGraph.registered_node_types["math/sum"];
        expect(node).toBeTruthy();
        expect(node.type).toBe("math/sum");
        expect(node.title).toBe("Sum");
        expect(node.category).toBe("math");
        expect(node.prototype.configure).toBe(
            lg.LGraphNode.prototype.configure
        );
    });

    test("callback triggers", () => {
        const consoleSpy = jest
            .spyOn(console, "log")
            .mockImplementation(() => {});

        lg.LiteGraph.onNodeTypeRegistered = jest.fn();
        lg.LiteGraph.onNodeTypeReplaced = jest.fn();
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(lg.LiteGraph.onNodeTypeRegistered).toHaveBeenCalled();
        expect(lg.LiteGraph.onNodeTypeReplaced).not.toHaveBeenCalled();
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(lg.LiteGraph.onNodeTypeReplaced).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringMatching("replacing node type")
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringMatching("math/sum")
        );
    });

    test("node with title", () => {
        Sum.title = "The sum title";
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        let node = lg.LiteGraph.registered_node_types["math/sum"];
        expect(node.title).toBe("The sum title");
        expect(node.title).not.toBe(node.name);
    });

    test("handle error simple object", () => {
        expect(() =>
            lg.LiteGraph.registerNodeType("math/sum", { simple: "type" })
        ).toThrow("Cannot register a simple object");
    });

    test("check shape mapping", () => {
        lg.LiteGraph.registerNodeType("math/sum", Sum);

        const node_type = lg.LiteGraph.registered_node_types["math/sum"];
        expect(new node_type().shape).toBe(undefined);
        node_type.prototype.shape = "default";
        expect(new node_type().shape).toBe(undefined);
        node_type.prototype.shape = "box";
        expect(new node_type().shape).toBe(lg.LiteGraph.BOX_SHAPE);
        node_type.prototype.shape = "round";
        expect(new node_type().shape).toBe(lg.LiteGraph.ROUND_SHAPE);
        node_type.prototype.shape = "circle";
        expect(new node_type().shape).toBe(lg.LiteGraph.CIRCLE_SHAPE);
        node_type.prototype.shape = "card";
        expect(new node_type().shape).toBe(lg.LiteGraph.CARD_SHAPE);
        node_type.prototype.shape = "custom_shape";
        expect(new node_type().shape).toBe("custom_shape");

        // Check that also works for replaced node types
        jest.spyOn(console, "log").mockImplementation(() => {});
        function NewCalcSum(a, b) {
            return a + b;
        }
        lg.LiteGraph.registerNodeType("math/sum", NewCalcSum);
        const new_node_type = lg.LiteGraph.registered_node_types["math/sum"];
        new_node_type.prototype.shape = "box";
        expect(new new_node_type().shape).toBe(lg.LiteGraph.BOX_SHAPE);
    });

    test("onPropertyChanged warning", () => {
        const consoleSpy = jest
            .spyOn(console, "warn")
            .mockImplementation(() => {});

        Sum.prototype.onPropertyChange = true;
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(consoleSpy).toBeCalledTimes(1);
        expect(consoleSpy).toBeCalledWith(
            expect.stringContaining("has onPropertyChange method")
        );
        expect(consoleSpy).toBeCalledWith(expect.stringContaining("math/sum"));
    });

    test("registering supported file extensions", () => {
        expect(lg.LiteGraph.node_types_by_file_extension).toEqual({});

        // Create two node types with calc_times overriding .pdf
        Sum.supported_extensions = ["PDF", "exe", null];
        function Times() {
            this.addInput("a", "number");
            this.addInput("b", "number");
            this.addOutput("times", "number");
        }
        Times.prototype.onExecute = function (a, b) {
            this.setOutputData(0, a * b);
        };
        Times.supported_extensions = ["pdf", "jpg"];
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        lg.LiteGraph.registerNodeType("math/times", Times);

        expect(
            Object.keys(lg.LiteGraph.node_types_by_file_extension).length
        ).toBe(3);
        expect(lg.LiteGraph.node_types_by_file_extension).toHaveProperty("pdf");
        expect(lg.LiteGraph.node_types_by_file_extension).toHaveProperty("exe");
        expect(lg.LiteGraph.node_types_by_file_extension).toHaveProperty("jpg");

        expect(lg.LiteGraph.node_types_by_file_extension.exe).toBe(Sum);
        expect(lg.LiteGraph.node_types_by_file_extension.pdf).toBe(Times);
        expect(lg.LiteGraph.node_types_by_file_extension.jpg).toBe(Times);
    });

    test("register in/out slot types", () => {
        expect(lg.LiteGraph.registered_slot_in_types).toEqual({});
        expect(lg.LiteGraph.registered_slot_out_types).toEqual({});

        // Test slot type registration with first type
        lg.LiteGraph.auto_load_slot_types = true;
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(lg.LiteGraph.registered_slot_in_types).toEqual({
            number: { nodes: ["math/sum"] },
        });
        expect(lg.LiteGraph.registered_slot_out_types).toEqual({
            number: { nodes: ["math/sum"] },
        });

        // Test slot type registration with second type
        function ToInt() {
            this.addInput("string", "string");
            this.addOutput("number", "number");
        };
        ToInt.prototype.onExecute = function (str) {
            this.setOutputData(0, Number(str));
        };
        lg.LiteGraph.registerNodeType("basic/to_int", ToInt);
        expect(lg.LiteGraph.registered_slot_in_types).toEqual({
            number: { nodes: ["math/sum"] },
            string: { nodes: ["basic/to_int"] },
        });
        expect(lg.LiteGraph.registered_slot_out_types).toEqual({
            number: { nodes: ["math/sum", "basic/to_int"] },
        });
    });
});

describe("unregister node types", () => {
    let lg;
    let Sum;

    beforeEach(() => {
        jest.resetModules();
        lg = require("./litegraph");
        Sum = function Sum() {
            this.addInput("a", "number");
            this.addInput("b", "number");
            this.addOutput("sum", "number");
        };
        Sum.prototype.onExecute = function (a, b) {
            this.setOutputData(0, a + b);
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("remove by name", () => {
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(lg.LiteGraph.registered_node_types["math/sum"]).toBeTruthy();

        lg.LiteGraph.unregisterNodeType("math/sum");
        expect(lg.LiteGraph.registered_node_types["math/sum"]).toBeFalsy();
    });

    test("remove by object", () => {
        lg.LiteGraph.registerNodeType("math/sum", Sum);
        expect(lg.LiteGraph.registered_node_types["math/sum"]).toBeTruthy();

        lg.LiteGraph.unregisterNodeType(Sum);
        expect(lg.LiteGraph.registered_node_types["math/sum"]).toBeFalsy();
    });

    test("try removing with wrong name", () => {
        expect(() => lg.LiteGraph.unregisterNodeType("missing/type")).toThrow(
            "node type not found: missing/type"
        );
    });

    test("no constructor name", () => {
        function BlankNode() {}
        BlankNode.constructor = {}
        lg.LiteGraph.registerNodeType("blank/node", BlankNode);
        expect(lg.LiteGraph.registered_node_types["blank/node"]).toBeTruthy()

        lg.LiteGraph.unregisterNodeType("blank/node");
        expect(lg.LiteGraph.registered_node_types["blank/node"]).toBeFalsy();
    })
});

describe("multi-input connections", () => {
    let lg;
    let Source;
    let Target;

    beforeEach(() => {
        jest.resetModules();
        lg = require("./litegraph");

        Source = function Source() {
            this.addOutput("out", "number");
        };
        Source.prototype.onExecute = function () {};

        Target = function Target() {
            this.addInput("in", "number");
            this.addOutput("out", "number");
        };
        Target.prototype.onExecute = function () {};

        lg.LiteGraph.registerNodeType("test/source", Source);
        lg.LiteGraph.registerNodeType("test/target", Target);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("inputs use links array instead of link", () => {
        var graph = new lg.LGraph();
        var node = lg.LiteGraph.createNode("test/target");
        graph.add(node);

        expect(node.inputs[0].links).toBeNull();
        expect(node.inputs[0]).not.toHaveProperty("link");
    });

    test("single connection works with links array", () => {
        var graph = new lg.LGraph();
        var source = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source);
        graph.add(target);

        source.connect(0, target, 0);

        expect(target.inputs[0].links).not.toBeNull();
        expect(target.inputs[0].links.length).toBe(1);
        expect(target.isInputConnected(0)).toBe(true);
        expect(target.getInputNode(0)).toBe(source);
    });

    test("single connection replaces existing when allow_multiple is false", () => {
        var graph = new lg.LGraph();
        var source1 = lg.LiteGraph.createNode("test/source");
        var source2 = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source1);
        graph.add(source2);
        graph.add(target);

        source1.connect(0, target, 0);
        expect(target.inputs[0].links.length).toBe(1);
        expect(target.getInputNode(0)).toBe(source1);

        // Second connection should replace the first (default behavior)
        source2.connect(0, target, 0);
        expect(target.inputs[0].links.length).toBe(1);
        expect(target.getInputNode(0)).toBe(source2);
    });

    test("allow_multiple input accepts multiple connections", () => {
        var graph = new lg.LGraph();
        var source1 = lg.LiteGraph.createNode("test/source");
        var source2 = lg.LiteGraph.createNode("test/source");
        var source3 = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source1);
        graph.add(source2);
        graph.add(source3);
        graph.add(target);

        // Enable allow_multiple on the input
        target.inputs[0].allow_multiple = true;

        source1.connect(0, target, 0);
        source2.connect(0, target, 0);
        source3.connect(0, target, 0);

        expect(target.inputs[0].links.length).toBe(3);
        expect(target.isInputConnected(0)).toBe(true);

        // getInputNode returns the first connected node
        expect(target.getInputNode(0)).toBe(source1);

        // getInputNodes returns all connected nodes
        var nodes = target.getInputNodes(0);
        expect(nodes.length).toBe(3);
        expect(nodes[0]).toBe(source1);
        expect(nodes[1]).toBe(source2);
        expect(nodes[2]).toBe(source3);
    });

    test("allow_multiple prevents duplicate connections from same source", () => {
        var graph = new lg.LGraph();
        var source = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source);
        graph.add(target);

        target.inputs[0].allow_multiple = true;

        source.connect(0, target, 0);
        var result = source.connect(0, target, 0);

        // Second connection from same source should be rejected
        expect(result).toBeNull();
        expect(target.inputs[0].links.length).toBe(1);
    });

    test("disconnectInput removes all links on multi-input", () => {
        var graph = new lg.LGraph();
        var source1 = lg.LiteGraph.createNode("test/source");
        var source2 = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source1);
        graph.add(source2);
        graph.add(target);

        target.inputs[0].allow_multiple = true;

        source1.connect(0, target, 0);
        source2.connect(0, target, 0);
        expect(target.inputs[0].links.length).toBe(2);

        target.disconnectInput(0);

        expect(target.inputs[0].links).toBeNull();
        expect(target.isInputConnected(0)).toBe(false);

        // Source outputs should also be cleaned up
        expect(source1.outputs[0].links.length).toBe(0);
        expect(source2.outputs[0].links.length).toBe(0);
    });

    test("disconnectOutput removes link from multi-input", () => {
        var graph = new lg.LGraph();
        var source1 = lg.LiteGraph.createNode("test/source");
        var source2 = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source1);
        graph.add(source2);
        graph.add(target);

        target.inputs[0].allow_multiple = true;

        source1.connect(0, target, 0);
        source2.connect(0, target, 0);
        expect(target.inputs[0].links.length).toBe(2);

        // Disconnect just source1's output from target
        source1.disconnectOutput(0, target);

        expect(target.inputs[0].links.length).toBe(1);
        expect(target.getInputNode(0)).toBe(source2);
    });

    test("getInputLinksArray returns all link objects", () => {
        var graph = new lg.LGraph();
        var source1 = lg.LiteGraph.createNode("test/source");
        var source2 = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source1);
        graph.add(source2);
        graph.add(target);

        target.inputs[0].allow_multiple = true;

        source1.connect(0, target, 0);
        source2.connect(0, target, 0);

        var links = target.getInputLinksArray(0);
        expect(links.length).toBe(2);
        expect(links[0].origin_id).toBe(source1.id);
        expect(links[1].origin_id).toBe(source2.id);
    });

    test("node removal cleans up multi-input links", () => {
        var graph = new lg.LGraph();
        var source1 = lg.LiteGraph.createNode("test/source");
        var source2 = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source1);
        graph.add(source2);
        graph.add(target);

        target.inputs[0].allow_multiple = true;

        source1.connect(0, target, 0);
        source2.connect(0, target, 0);

        // Remove source1 - target should still have source2 connected
        graph.remove(source1);

        expect(target.inputs[0].links.length).toBe(1);
        expect(target.getInputNode(0)).toBe(source2);
    });

    test("clone clears multi-input links", () => {
        var graph = new lg.LGraph();
        var source1 = lg.LiteGraph.createNode("test/source");
        var source2 = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source1);
        graph.add(source2);
        graph.add(target);

        target.inputs[0].allow_multiple = true;

        source1.connect(0, target, 0);
        source2.connect(0, target, 0);

        var cloned = target.clone();
        expect(cloned.inputs[0].links).toBeNull();
    });

    test("serialization round-trip preserves multi-input links", () => {
        var graph = new lg.LGraph();
        var source1 = lg.LiteGraph.createNode("test/source");
        var source2 = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source1);
        graph.add(source2);
        graph.add(target);

        target.inputs[0].allow_multiple = true;

        source1.connect(0, target, 0);
        source2.connect(0, target, 0);

        // Serialize
        var data = graph.serialize();

        // Verify serialized format uses links array
        var serialized_target = data.nodes.find(function(n) { return n.type === "test/target"; });
        expect(serialized_target.inputs[0].links).toBeDefined();
        expect(serialized_target.inputs[0].links.length).toBe(2);

        // Deserialize into new graph
        var graph2 = new lg.LGraph();
        graph2.configure(data);

        var target2 = graph2._nodes.find(function(n) { return n.type === "test/target"; });
        expect(target2.inputs[0].links.length).toBe(2);
        expect(target2.isInputConnected(0)).toBe(true);
    });

    test("old serialization format with link property is migrated", () => {
        var graph = new lg.LGraph();

        // Simulate old format data
        var old_data = {
            last_node_id: 3,
            last_link_id: 1,
            nodes: [
                {
                    id: 1,
                    type: "test/source",
                    pos: [100, 100],
                    size: [100, 30],
                    flags: {},
                    order: 0,
                    mode: 0,
                    outputs: [{ name: "out", type: "number", links: [1] }]
                },
                {
                    id: 2,
                    type: "test/target",
                    pos: [300, 100],
                    size: [100, 30],
                    flags: {},
                    order: 1,
                    mode: 0,
                    inputs: [{ name: "in", type: "number", link: 1 }],
                    outputs: [{ name: "out", type: "number", links: null }]
                }
            ],
            links: [[1, 1, 0, 2, 0, "number"]],
            groups: [],
            config: {},
            extra: {},
            version: 0.4
        };

        graph.configure(old_data);

        var target = graph._nodes.find(function(n) { return n.type === "test/target"; });
        // Old link property should be migrated to links array
        expect(target.inputs[0].links).not.toBeNull();
        expect(target.inputs[0].links.length).toBe(1);
        expect(target.inputs[0].links[0]).toBe(1);
        expect(target.isInputConnected(0)).toBe(true);
    });

    test("addInput with allow_multiple via extra_info", () => {
        var graph = new lg.LGraph();

        function MultiTarget() {
            this.addInput("deps", "dependency", { allow_multiple: true });
            this.addOutput("out", "number");
        }
        MultiTarget.prototype.onExecute = function () {};
        lg.LiteGraph.registerNodeType("test/multi_target", MultiTarget);

        var node = lg.LiteGraph.createNode("test/multi_target");
        graph.add(node);

        expect(node.inputs[0].allow_multiple).toBe(true);
        expect(node.inputs[0].links).toBeNull();
    });

    test("findInputSlotFree considers allow_multiple slots as free", () => {
        var graph = new lg.LGraph();

        function MultiTarget() {
            this.addInput("deps", "number", { allow_multiple: true });
        }
        MultiTarget.prototype.onExecute = function () {};
        lg.LiteGraph.registerNodeType("test/multi_target2", MultiTarget);

        var source = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/multi_target2");
        graph.add(source);
        graph.add(target);

        source.connect(0, target, 0);
        expect(target.inputs[0].links.length).toBe(1);

        // Even though the slot has a connection, findInputSlotFree should still
        // return it because allow_multiple is true
        var free = target.findInputSlotFree();
        expect(free).toBe(0);
    });

    test("removeLink removes only the specific link on multi-input slot", () => {
        var graph = new lg.LGraph();
        var source1 = lg.LiteGraph.createNode("test/source");
        var source2 = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source1);
        graph.add(source2);
        graph.add(target);

        target.inputs[0].allow_multiple = true;

        source1.connect(0, target, 0);
        source2.connect(0, target, 0);
        expect(target.inputs[0].links.length).toBe(2);

        // Get the link_id for source1's connection
        var link_id_to_remove = target.inputs[0].links[0];
        var link_info = graph.links[link_id_to_remove];
        expect(link_info.origin_id).toBe(source1.id);

        // Remove only source1's link via graph.removeLink
        graph.removeLink(link_id_to_remove);

        // source2's link should still exist
        expect(target.inputs[0].links).not.toBeNull();
        expect(target.inputs[0].links.length).toBe(1);
        expect(target.getInputNode(0)).toBe(source2);

        // source1's output should be cleaned up
        expect(source1.outputs[0].links.length).toBe(0);
        // source2's output should still be connected
        expect(source2.outputs[0].links.length).toBe(1);

        // The removed link should be gone from graph.links
        expect(graph.links[link_id_to_remove]).toBeUndefined();
    });

    test("removeLink fires onConnectionsChange for both sides", () => {
        var graph = new lg.LGraph();
        var source1 = lg.LiteGraph.createNode("test/source");
        var source2 = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source1);
        graph.add(source2);
        graph.add(target);

        target.inputs[0].allow_multiple = true;

        source1.connect(0, target, 0);
        source2.connect(0, target, 0);

        var link_id_to_remove = target.inputs[0].links[0];

        // Track callbacks
        var targetCallbacks = [];
        var sourceCallbacks = [];
        target.onConnectionsChange = function(type, slot, connected, link_info) {
            targetCallbacks.push({ type, slot, connected, origin_id: link_info.origin_id });
        };
        source1.onConnectionsChange = function(type, slot, connected, link_info) {
            sourceCallbacks.push({ type, slot, connected });
        };

        graph.removeLink(link_id_to_remove);

        // Target should get INPUT disconnection callback
        expect(targetCallbacks.length).toBe(1);
        expect(targetCallbacks[0].type).toBe(lg.LiteGraph.INPUT);
        expect(targetCallbacks[0].connected).toBe(false);
        expect(targetCallbacks[0].origin_id).toBe(source1.id);

        // Source should get OUTPUT disconnection callback
        expect(sourceCallbacks.length).toBe(1);
        expect(sourceCallbacks[0].type).toBe(lg.LiteGraph.OUTPUT);
        expect(sourceCallbacks[0].connected).toBe(false);
    });

    test("computeExecutionOrder counts multi-input links correctly", () => {
        var graph = new lg.LGraph();
        var source1 = lg.LiteGraph.createNode("test/source");
        var source2 = lg.LiteGraph.createNode("test/source");
        var target = lg.LiteGraph.createNode("test/target");
        graph.add(source1);
        graph.add(source2);
        graph.add(target);

        target.inputs[0].allow_multiple = true;

        source1.connect(0, target, 0);
        source2.connect(0, target, 0);

        // Should not throw and should produce a valid order
        var order = graph.computeExecutionOrder();
        expect(order).toBeTruthy();
        expect(order.length).toBe(3);
        // Sources should come before target in execution order
        var targetIndex = order.indexOf(target);
        var source1Index = order.indexOf(source1);
        var source2Index = order.indexOf(source2);
        expect(source1Index).toBeLessThan(targetIndex);
        expect(source2Index).toBeLessThan(targetIndex);
    });
});
