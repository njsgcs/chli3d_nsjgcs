// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.
import {
    AsyncController,
    CancelableCommand,
    EditableShapeNode,
    GeometryNode,
    IDocument,
    IEdge,
    IFace,
    INode,
    IShape,
    IShapeFilter,
    IShell,
    Logger,
    MultiShapeNode,
    PubSub,
    Result,
    ShapeNode,
    ShapeType,
    Transaction,
    XYZ,
    command,
} from "chili-core";
import { Graph } from "graphlib";
import { FaceNode } from "../../bodys/face";
import { WireNode } from "../../bodys/wire";
import { SelectShapeNodeStep } from "../../step";

abstract class ConvertCommand extends CancelableCommand {
    async executeAsync(): Promise<void> {
        const models = await this.getOrPickModels(this.document);
        if (!models) {
            PubSub.default.pub("showToast", "toast.select.noSelected");
            return;
        }
        Transaction.execute(this.document, `excute ${Object.getPrototypeOf(this).data.name}`, () => {
            const node = this.create(this.document, models);
            if (!node.isOk) {
                PubSub.default.pub("showToast", "toast.converter.error");
            } else {
                this.document.addNode(node.value);
                this.document.visual.update();
                PubSub.default.pub("showToast", "toast.success");
            }

           // models.forEach((x) => x.parent?.remove(x));
        });
    }

    protected abstract create(document: IDocument, models: INode[]): Result<GeometryNode>;
    protected shapeFilter(): IShapeFilter {
        return {
            allow: (shape: IShape) =>
                shape.shapeType === ShapeType.Edge || shape.shapeType === ShapeType.Wire,
        };
    }

    async getOrPickModels(document: IDocument) {
        const filter = this.shapeFilter();
        let models = this._getSelectedModels(document, filter);
        document.selection.clearSelection();
        if (models.length > 0) return models;

        const step = new SelectShapeNodeStep("prompt.select.models", { filter, multiple: true });
        this.controller = new AsyncController();
        const data = await step.execute(document, this.controller);
        document.selection.clearSelection();
        return data?.nodes;
    }

    private _getSelectedModels(document: IDocument, filter?: IShapeFilter) {
        return document.selection
            .getSelectedNodes()
            .map((x) => x as ShapeNode)
            .filter((x) => {
                if (x === undefined) return false;
                let shape = x.shape.value;
                if (shape === undefined) return false;
                if (filter !== undefined && !filter.allow(shape)) return false;
                return true;
            });
    }
}

@command({
    name: "convert.toWire",
    display: "command.toWire",
    icon: "icon-toPoly",
})
export class ConvertToWire extends ConvertCommand {
    protected override create(document: IDocument, models: ShapeNode[]): Result<GeometryNode> {
        const edges = models.map((x) => x.shape.value.copy()) as IEdge[];
        const wireBody = new WireNode(document, edges);
        const shape = wireBody.generateShape();
        if (!shape.isOk) return Result.err(shape.error);

        return Result.ok(wireBody);
    }
}
function buildGraphFromEdges(
    edges: IEdge[]
): { graph: Graph; edgeIndexMap: Map<string, number[]> } {
    const graph = new Graph({ directed: false });
    const edgeIndexMap = new Map<string, number[]>();

    edges.forEach((edge, index) => {
        const start = pointToString(edge.curve().startPoint());
        const end = pointToString(edge.curve().endPoint());

        graph.setEdge(start, end);

        if (!edgeIndexMap.has(start)) edgeIndexMap.set(start, []);
        if (!edgeIndexMap.has(end)) edgeIndexMap.set(end, []);

        edgeIndexMap.get(start)!.push(index);
        edgeIndexMap.get(end)!.push(index);
    });

    return { graph, edgeIndexMap };
}
function findCyclesWithEdgeIndices(
    graph: Graph,
    edgeIndexMap: Map<string, number[]>
): { nodeCycles: string[][]; edgeCycles: number[][] } {
    const nodeCycles: string[][] = [];
    const edgeCycles: number[][] = [];

    for (const start of graph.nodes()) {
        const stack: { current: string; path: string[]; visited: Set<string> }[] = [];
        stack.push({ current: start, path: [], visited: new Set() });

        while (stack.length > 0) {
            const { current, path, visited } = stack.pop()!;
            if (visited.has(current)) continue;

            const newPath = [...path, current];
            const newVisited = new Set(visited);
            newVisited.add(current);

            const neighbors = graph.neighbors(current) || [];

            for (const neighbor of neighbors) {
                if (newPath.length > 1 && newPath[newPath.length - 2] === neighbor) {
                    continue;
                }

                if (neighbor === start && newPath.length >= 3) {
                    nodeCycles.push(newPath);

                    // 根据路径上的点，提取共用边的索引
                    const edgeIndices = new Set<number>();
                    for (let i = 0; i < newPath.length; i++) {
                        const a = newPath[i];
                        const b = newPath[(i + 1) % newPath.length];
                        const indicesA = edgeIndexMap.get(a) || [];
                        const indicesB = edgeIndexMap.get(b) || [];
                        const common = indicesA.filter((idx) => indicesB.includes(idx));
                        common.forEach((idx) => edgeIndices.add(idx));
                    }

                    edgeCycles.push([...edgeIndices]);
                } else if (!newVisited.has(neighbor)) {
                    stack.push({
                        current: neighbor,
                        path: newPath,
                        visited: newVisited,
                    });
                }
            }
        }
    }

    return { nodeCycles, edgeCycles };
}
function isPointsCoplanar(points: XYZ[]): boolean {
    if (points.length <= 3) return true; // 3个点或更少一定共面

    const p0 = points[0];
    const p1 = points[1];
    const p2 = points[2];

    // 计算平面的法向量
    const v1 =new XYZ(p1.x - p0.x,p1.y - p0.y,p1.z - p0.z) ;
    const v2 =new XYZ(p2.x - p0.x,p2.y - p0.y,p2.z - p0.z ) ;
    const normal = crossProduct(v1, v2);

    // 平面方程 ax + by + cz + d = 0
    const a = normal.x;
    const b = normal.y;
    const c = normal.z;
    const d = -(a * p0.x + b * p0.y + c * p0.z);

    for (let i = 3; i < points.length; i++) {
        const p = points[i];
        const distance = Math.abs(a * p.x + b * p.y + c * p.z + d);
        if (distance > Number.EPSILON) {
            return false; // 点不共面
        }
    }

    return true;
}

// 向量叉乘
function crossProduct(v1: XYZ, v2: XYZ): XYZ {
  const xyz=new XYZ(  v1.y * v2.z - v1.z * v2.y,
        v1.z * v2.x - v1.x * v2.z,
         v1.x * v2.y - v1.y * v2.x,)
    return xyz;
}

// 提取边中的点
function extractPointsFromEdges(edges: IEdge[]): XYZ[] {
    const pointsSet = new Set<string>();
    const pointsList: XYZ[] = [];

    edges.forEach(edge => {
        const start = edge.curve().startPoint();
        const end = edge.curve().endPoint();

        addUniquePoint(start, pointsSet, pointsList);
        addUniquePoint(end, pointsSet, pointsList);
    });

    return pointsList;
}

// 防止重复点
function addUniquePoint(point: XYZ, set: Set<string>, list: XYZ[]) {
    const key = `${point.x},${point.y},${point.z}`;
    if (!set.has(key)) {
        set.add(key);
        list.push(point);
    }
}

// 过滤不在同一平面上的边
function filterNonCoplanarEdges(edges: IEdge[]): IEdge[] {
    const coplanarEdges: IEdge[] = [];
    const points = extractPointsFromEdges(edges);

    if (isPointsCoplanar(points)) {
        coplanarEdges.push(...edges);
    }

    return coplanarEdges;
}
function getCycleEdges(cycle: string[], allEdges: IEdge[]): IEdge[] {
    const cycleEdges: IEdge[] = [];

    for (let i = 0; i < cycle.length; i++) {
        const start = cycle[i];
        const end = cycle[(i + 1) % cycle.length];

        const matchedEdge = allEdges.find(edge => {
            const edgeStart = pointToString(edge.curve().startPoint());
            const edgeEnd = pointToString(edge.curve().endPoint());
            return (
                (edgeStart === start && edgeEnd === end) ||
                (edgeStart === end && edgeEnd === start)
            );
        });

        if (matchedEdge) {
            cycleEdges.push(matchedEdge);
        }
    }

    return cycleEdges;
}
function pointToString(point: XYZ): string {
   return `${point.x.toFixed(0)}-${point.y.toFixed(0)}-${point.z.toFixed(0)}`;
    }
@command({
    name: "convert.toFace",
    display: "command.toFace",
    icon: "icon-toFace",
})
export class ConvertToFace extends ConvertCommand {  
    protected override create(document: IDocument, models: ShapeNode[]): Result<GeometryNode> {  
        const edges = models.map((x) => x.shape.value.copy()) as IEdge[];  
      const { graph, edgeIndexMap } = buildGraphFromEdges(edges);
const { nodeCycles, edgeCycles } = findCyclesWithEdgeIndices(graph, edgeIndexMap);
const addedCycles = new Set<string>(); // 用于跟踪已添加的环
const validEdgeCycles = edgeCycles.filter((cycle, i) => nodeCycles[i].length >= 4);
Logger.info("Edge Cycles:", validEdgeCycles);

// 去重处理
const uniqueValidEdgeCycles = validEdgeCycles.filter((cycle) => {
    const cycleKey = [...cycle].map(i => nodeCycles[i]).flat().sort().join("-");
    if (addedCycles.has(cycleKey)) {
        Logger.warn("Skip duplicate cycle", cycleKey);
        return false;
    }
    addedCycles.add(cycleKey);
    return true;
});

Logger.info("Unique Valid Edge Cycles:", uniqueValidEdgeCycles);

const coplanarEdgeCycles: string[][] = [];

 for (let i = 0; i < uniqueValidEdgeCycles.length; i++) {
    const edgeCycle = uniqueValidEdgeCycles[i];
    const nodeCycle = nodeCycles[i];

    // 提取该环涉及的所有边
    const cycleEdges = edgeCycle.map(index => edges[index]);

    // 判断这些边是否共面
    const points = extractPointsFromEdges(cycleEdges);
    const isCoplanar = isPointsCoplanar(points);

    if (isCoplanar) {
       coplanarEdgeCycles.push(edgeCycle.map(String)); // 将number[]转换为string[]
    } else {
        Logger.warn(`Skipped non-coplanar cycle (edges: ${edgeCycle.join(",")}):`, nodeCycle.join(" → "));
    }
}

    if (coplanarEdgeCycles.length === 0) {
        Logger.warn("No coplanar cycles found.");
        return Result.err("No coplanar cycles found.");
    }
    Logger.info("coplanarEdgeCycles.length", coplanarEdgeCycles.length);
        const faces: IShape[] = [];  
       
        for (const cycleNodes of coplanarEdgeCycles) {  
            // 序列化当前环的节点路径
            const cycleKey = [...cycleNodes].sort().join("-"); // 排序后拼接以避免方向影响
            
            if (addedCycles.has(cycleKey)) {
                Logger.warn("Skip duplicate cycle", cycleKey);
                continue; // 跳过重复环
            }
            
            addedCycles.add(cycleKey); // 记录新环
            
            const loopEdges: IEdge[] = [];  
              for (let i = 0; i < cycleNodes.length; i++) {
            const start = cycleNodes[i];
            const end = cycleNodes[(i + 1) % cycleNodes.length]; // 环状连接
            
            // 根据起点和终点匹配原始边
            const matchedEdge = edges.find(edge => {
                const edgeStart = pointToString(edge.curve().startPoint());
                const edgeEnd = pointToString(edge.curve().endPoint());
                return (
                    (edgeStart === start && edgeEnd === end) ||
                    (edgeStart === end && edgeEnd === start) // 支持反向匹配
                );
            });

            if (matchedEdge) {
                loopEdges.push(matchedEdge);
            }
        }
            const wireBody = new FaceNode(document, loopEdges);  
            const shape = wireBody.generateShape();  
            if (!shape.isOk) return Result.err(shape.error);  
              
            faces.push(shape.value);  
        }  
       Logger.info("Faces created:", faces);  
        // 使用 MultiShapeNode 包装多个面  
        return Result.ok(new MultiShapeNode(document, "Multiple Faces", faces));  
    }  
}

@command({
    name: "convert.toShell",
    display: "command.toShell",
    icon: "icon-toShell",
})
export class ConvertToShell extends ConvertCommand {
    protected override shapeFilter(): IShapeFilter {
        return {
            allow: (shape: IShape) => shape.shapeType === ShapeType.Face,
        };
    }

    protected override create(document: IDocument, models: ShapeNode[]): Result<GeometryNode> {
        const faces = models.map((x) => x.shape.value.copy()) as IFace[];
        const shape = this.application.shapeFactory.shell(faces);
        if (!shape.isOk) return Result.err(shape.error);

        const shell = new EditableShapeNode(document, "shell", shape);
        return Result.ok(shell);
    }
}

@command({
    name: "convert.toSolid",
    display: "command.toSolid",
    icon: "icon-toSolid",
})
export class ConvertToSolid extends ConvertCommand {
    protected override shapeFilter(): IShapeFilter {
        return {
            allow: (shape: IShape) => shape.shapeType === ShapeType.Shell,
        };
    }

    protected override create(document: IDocument, models: ShapeNode[]): Result<GeometryNode> {
        const faces = models.map((x) => x.shape.value.copy()) as IShell[];
        const shape = this.application.shapeFactory.solid(faces);
        if (!shape.isOk) return Result.err(shape.error);

        const solid = new EditableShapeNode(document, "solid", shape);
        return Result.ok(solid);
    }
}
