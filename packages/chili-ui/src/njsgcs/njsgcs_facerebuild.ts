import { FaceNode } from "chili";
import {
    IDocument,
    IEdge,
    Logger,
    ShapeNode,
    XYZ
} from "chili-core";
import { Graph } from "graphlib";
function pointToString(point: XYZ): string {
   return `${point.x.toFixed(1)}-${point.y.toFixed(1)}-${point.z.toFixed(1)}`;
    }
function buildGraphFromEdges(
    edges: IEdge[]
): { graph: Graph; edgeIndexMap: Map<string, number[]> } {
    const graph = new Graph({ directed: false });
    const edgeIndexMap = new Map<string, number[]>();
    const edgePairSet = new Map<string, number>(); // 新增：记录已添加的边对

    edges.forEach((edge, index) => {
        const start = pointToString(edge.curve().startPoint());
        const end = pointToString(edge.curve().endPoint());

        // 构建唯一键，保证无向边的唯一性（无论起点终点顺序）
        const key = [start, end].sort().join('|');

        // 如果该边对已经存在，则不再重复添加图边
        if (!edgePairSet.has(key)) {
            graph.setEdge(start, end);
            edgePairSet.set(key, index);
        }

        // 维护每个点对应的边索引
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
    const addedCycles = new Set<string>(); // 记录已添加的环路径
    const usedEdgesInCycles = new Set<string>(); // 记录所有已被使用的边组合

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
                // 跳过回头路（避免 A → B → A）
                if (newPath.length > 1 && newPath[newPath.length - 2] === neighbor) {
                    continue;
                }

                // 检查是否回到起点并形成环
                if (neighbor === start && newPath.length >= 3) {
                    // 构造唯一标识符（排序节点）用于去重
                    const cycleKey = [...newPath].sort().join('-');

                    if (!addedCycles.has(cycleKey)) {
                        nodeCycles.push(newPath);
                        addedCycles.add(cycleKey); // 标记为已添加

                        // 提取边索引，并确保每条边只用一次
                        const edgeIndices = new Set<number>();
                        const usedEdgesInThisCycle = new Set<string>(); // 当前环中已使用的边

                        for (let i = 0; i < newPath.length; i++) {
                            const a = newPath[i];
                            const b = newPath[(i + 1) % newPath.length];

                            // 边的唯一标识（无向）
                            const edgeKey = [a, b].sort().join('|');

                            // 如果这条边已经被这个环使用过，则跳过
                            if (usedEdgesInThisCycle.has(edgeKey)) continue;

                            // 获取共享该边的索引
                            const indicesA = edgeIndexMap.get(a) || [];
                            const indicesB = edgeIndexMap.get(b) || [];
                            const common = indicesA.filter((idx) => indicesB.includes(idx));

                            if (common.length > 0) {
                                edgeIndices.add(common[0]); // 使用第一个匹配的边索引
                                usedEdgesInThisCycle.add(edgeKey); // 当前环中标记为已使用
                                usedEdgesInCycles.add(edgeKey);   // 全局标记为已使用
                            }
                        }

                        edgeCycles.push([...edgeIndices]);
                    }
                } else if (!newVisited.has(neighbor)) {
                    // 继续深度优先搜索
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
function addUniquePoint(point: XYZ, set: Set<string>, list: XYZ[]) {
    const key = `${point.x},${point.y},${point.z}`;
    if (!set.has(key)) {
        set.add(key);
        list.push(point);
    }
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
export function face_rebuild(document: IDocument): void {
    const models=document.selection
                 .getSelectedNodes()
                 .map((x) => x as ShapeNode)
                 .filter((x) => {
                     if (x === undefined) return false;
                     let shape = x.shape.value;
                     if (shape === undefined) return false;
                   
                     return true;
                 });
        document.selection.clearSelection();
    const edges = models.map((x) => x.shape.value.copy()) as IEdge[];  
      const { graph, edgeIndexMap } = buildGraphFromEdges(edges);
const { nodeCycles, edgeCycles } = findCyclesWithEdgeIndices(graph, edgeIndexMap);
const addedCycles = new Set<string>(); // 用于跟踪已添加的环
const validEdgeCycles = edgeCycles.filter((cycle, i) => nodeCycles[i].length >= 4);
//Logger.info("Edge Cycles:", validEdgeCycles);





 for (let i = 0; i < validEdgeCycles .length; i++) {
    const edgeCycle = validEdgeCycles [i];
    const nodeCycle = nodeCycles[i];

    // 提取该环涉及的所有边
    const cycleEdges = edgeCycle.map(index => edges[index]);

    // 判断这些边是否共面
    const points = extractPointsFromEdges(cycleEdges);
    const isCoplanar = isPointsCoplanar(points);

    if (isCoplanar) {
        Logger.info(`Rebuilding face (edges: ${edgeCycle.join(",")}):`, nodeCycle.join(" → "));
      cycleEdges.map(edge => (
        Logger.info(`  ${pointToString(edge.curve().startPoint())} → ${pointToString(edge.curve().endPoint())}`
       )));
        document.addNode(new FaceNode(document, cycleEdges));
    } else {
      //  Logger.info(`Skipped non-coplanar cycle (edges: ${edgeCycle.join(",")}):`, nodeCycle.join(" → "));
    }
}


       
       

}
