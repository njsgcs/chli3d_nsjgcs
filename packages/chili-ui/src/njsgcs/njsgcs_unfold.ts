import { ArcNode } from "chili";
import {
  IDocument,
  IEdge,
  INode,
  Logger,
  Matrix4,
  PubSub,
  ShapeNode,
  XYZ
} from "chili-core";
import cytoscape from "cytoscape";

export function unfold(document: IDocument): void {
  function getAllNodes(node: INode): INode[] {    
    const result: INode[] = [];    
        
    // 添加当前节点    
    result.push(node);    
        
    // 检查是否为容器节点，然后递归遍历子节点    
    if (INode.isLinkedListNode(node)) {  
        let child = node.firstChild;    
        while (child) {    
            result.push(...getAllNodes(child));    
            child = child.nextSibling;    
        }    
    }  
        
    return result;    
  }  
    
  
   
    
    
    const models= getAllNodes(document.rootNode)  
                 
                 .map((x) => x as ShapeNode)
                 .filter((x) => {
                     if (x === undefined) return false;

                     if (!x.shape || !x.shape.value) return false;
                    //  if (x instanceof ArcNode) {
                    //     arcnodes.push(x);
                    //            return false; // 排除 ArcNode 类型
                    //        }
                     return true;
                 });
        document.selection.clearSelection();
    
// 存储所有节点 ID，避免重复
const nodeSet = new Set<string>();
const cyElements: cytoscape.ElementDefinition[] = [];

const arcnodemap: Map<number, ArcNode> = new Map();

let arcid=0;
     const arcStartIds = new Set<string>();
for (let i = 0; i < models.length; i++) {
  const model = models[i];
  
  const edge = model.shape.value.copy() as IEdge;
  const start = edge.curve().startPoint();
  const end = edge.curve().endPoint();

  // 使用唯一标识符作为节点 ID，比如坐标点字符串
  const startId = `${start.x}-${start.y}-${start.z}`;
  const endId = `${end.x}-${end.y}-${end.z}`;

  // 添加起点节点（如果未添加过）
 if (!nodeSet.has(startId)) {
    cyElements.push({
      data: { id: startId 
        
      },
    });

  }
  // 添加终点节点（如果未添加过）
  if (!nodeSet.has(endId)) {
    cyElements.push({
      data: { id: endId },
    });
    nodeSet.add(endId);
  }
  if(model instanceof ArcNode){
      // 添加边
      
     arcStartIds.add(startId);
       arcnodemap.set(arcid,model);
       arcid++;
      Logger.info(i," ArcNode");
  cyElements.push({
    data: {
      id: `${i}`,
      source: startId,
      target: endId,
       type:  'arc' 
    },
    
  });
  }
  else{
    
     // 添加边
  cyElements.push({
    data: {
      id: `${i}`,
      source: startId,
      target: endId,
      type:  'line'
      
    },
   
  });


  }

}
for (const element of cyElements) {
  if (element.data && arcStartIds.has(element.data.id!)) {
    element.data["label"] = "start";
  }
}
/**
 * 存储弧中心点与对应的弧节点 ID 列表的映射
 * 
 * - key: 弧中心点的唯一标识字符串，格式为 `${x}-${y}` 或类似组合
 *        表示该弧所在的平面中心坐标（根据法线方向选择维度）
 * - value: 与该中心点关联的所有 ArcNode 的 ID 数组
 */
const arccentermap:Map<string,number[]>=new Map();
for (let i = 0; i < arcid+1; i++) {
  const arcnode = arcnodemap.get(i);
  if(arcnode){
    const center = arcnode.center;
    const normal = arcnode.normal;
     if (normal.x === 0 && normal.y === 0 && normal.z === 1) {
      const centerId = `${center.x}-${center.y}`; // 只取 x 和 y
      arccentermap.get(centerId)?.push(i) || arccentermap.set(centerId, [i]); // 存入 map 中
  
    }else if (normal.x === 0 && normal.y === 1 && normal.z === 0) {
      const centerId = `${center.x}-${center.z}`; // 只取 x 和 z
       arccentermap.get(centerId)?.push(i) || arccentermap.set(centerId, [i]); // 存入 map 中
    }
    else if (normal.x === 1 && normal.y === 0 && normal.z === 0) {
      const centerId = `${center.y}-${center.z}`; // 只取 y 和 z
       arccentermap.get(centerId)?.push(i) || arccentermap.set(centerId, [i]); // 存入 map 中
    }
  }
}
Logger.info("arccentermap:");
const arccenterstartpointmap: Map<string,string[]> = new Map();
const arccenterendpointmap: Map<string,string[]> = new Map();
for (const [key, value] of arccentermap) {
  Logger.info(`CENTER:${key}: ${value}`);
  for (const i of value) {
    const arc = arcnodemap.get(i);
    if(arc){
      const edge= arc.shape.value.copy() as IEdge;
      const start = edge.curve().startPoint();
      const startId = `${start.x}-${start.y}-${start.z}`;
      arccenterstartpointmap.get(key)?.push(startId) || arccenterstartpointmap.set(key, [startId]);
      const end = edge.curve().endPoint();
      const endId = `${end.x}-${end.y}-${end.z}`;
      arccenterendpointmap.get(key)?.push(endId) || arccenterendpointmap.set(key, [endId]);
      const angle = arc.angle;
      Logger.info(`ARC:${i}: ${start} ${end} ${angle}`);
    }
   
  }
}
Logger.info("arccenterstartpointmap:")
for (const [key, value] of arccenterstartpointmap) {
  Logger.info(`${key}: ${value}`);
}
Logger.info("arccenterendpointmap:")
for (const [key, value] of arccenterendpointmap) {
  Logger.info(`${key}: ${value}`);
}
// 发送完整图数据给视图组件

//PubSub.default.pub("njsgcs_graphview",cyElements);


       const filteredCyElements = cyElements.filter(el => el.data["type"] !== 'arc');
       const cywithoutarc = cytoscape({ elements: filteredCyElements });
      // PubSub.default.pub("njsgcs_graphview",filteredCyElements);
       const components =  cywithoutarc.elements().components();

Logger.info(`检测到 ${components.length} 个连通区域`);

components.forEach((component, index) => {
  Logger.info(`连通区域 ${index }:`);
  component.nodes().forEach(node => {
    Logger.info(` - 节点: ${node.id()}`);
  });
  // component.edges().forEach(edge => {
  //   Logger.info(` - 边: ${edge.source().id()} -> ${edge.target()}`);
  // });
});
const componentmap: Map<number, cytoscape.CollectionReturnValue> = new Map();
for (let i = 0; i < components.length; i++) {
  componentmap.set(i,components[i]);
}
const arccomponentstartmap: Map<string, Set<number>> = new Map();
const arccomponentendmap: Map<string, Set<number>> = new Map();
for (const [id,component] of componentmap) {
  const nodes = component.nodes();
  const nodeIds = nodes.map(node => node.id());
  for (const [key, value] of arccenterstartpointmap){
    if (value.some(v => nodeIds.includes(v))){
      arccomponentstartmap.get(key)?.add(id) || arccomponentstartmap.set(key, new Set([id]));
    }
  }
  for (const [key, value] of arccenterendpointmap){
    if (value.some(v => nodeIds.includes(v))){
      arccomponentendmap.get(key)?.add(id) || arccomponentendmap.set(key,new Set([id]));
    }
  }
  
}

Logger.info("arccomponentstartmap:")
for (const [key, value] of arccomponentstartmap) {
  Logger.info(`${key}: ${Array.from(value)}`);
}
  Logger.info("arccomponentendmap:")
  for (const [key, value] of arccomponentendmap) {
    Logger.info(`${key}: ${Array.from(value)}`);
  }


const componentcyElements=new Array<cytoscape.ElementDefinition>();
const forwardmap = new Map<string, string[]>();
const backwardmap = new Map<string, string[]>();
const transformmap = new Map<string, string>();
const aparetimemap = new Map<string, number>();
const startcompons = new Set<string>();
for (const [key, value] of arccentermap) {
  const part1: { start: string, end: string }[] = [];
  const part2: { start: string, end: string }[] = [];

  const startComponentIds = Array.from(arccomponentstartmap.get(key) || []);
  const endComponentIds = Array.from(arccomponentendmap.get(key) || []);

  
  for (const id of startComponentIds) {
    part1.push(...componentmap.get(id)?.edges().map(edge => ({
      start: edge.source().id(),
      end: edge.target().id()
    })) || []);
  }

  for (const id of endComponentIds) {
    part2.push(...componentmap.get(id)?.edges().map(edge => ({
      start: edge.source().id(),
      end: edge.target().id()
    })) || []);
  }

  // 去重函数
  function deduplicate(edges: { start: string, end: string }[]) {
    const seen = new Set();
    return edges.filter(edge => {
      const key = [edge.start, edge.end].sort().join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const dedupedPart1 = deduplicate(part1);
  const dedupedPart2 = deduplicate(part2);
 const dedupedPart1key=JSON.stringify(dedupedPart1);
  const dedupedPart2key=JSON.stringify(dedupedPart2);
 componentcyElements.push({ data: { id: dedupedPart1key} });
 componentcyElements.push({ data: { id: dedupedPart2key} });
 componentcyElements.push({ data: { id: key, source: dedupedPart1key, target: dedupedPart2key } });
forwardmap.get(dedupedPart1key)?.push(dedupedPart2key) ||forwardmap.set( dedupedPart1key, [dedupedPart2key]);
backwardmap.get(dedupedPart2key)?.push(dedupedPart1key) || backwardmap.set( dedupedPart2key, [dedupedPart1key]);
  transformmap.set( dedupedPart1key+dedupedPart2key, key);
  startcompons.add(dedupedPart1key);
const count1 = aparetimemap.get(dedupedPart1key) || 0;
aparetimemap.set(dedupedPart1key, count1 + 1);


const count2 = aparetimemap.get(dedupedPart2key) || 0;
aparetimemap.set(dedupedPart2key, count2 + 1);

}
for (const element of componentcyElements) {
  if (element.data && startcompons.has(element.data.id!)) {
    element.data["label"] = "start";
  }
}
//PubSub.default.pub("njsgcs_graphview",componentcyElements);

const singleOccurrenceKeys = Array.from(aparetimemap.entries())
  .filter(([_, count]) => count === 1)
  .map(([key]) => key);
function processKey(
  key: string,
  transformer: Matrix4,
  isForward: boolean,
  queue: { currentKey: string; currenttransformer: Matrix4 }[],
  visited: Set<string>
) {
  if (visited.has(key)) return;
  visited.add(key);

  const map = isForward ? forwardmap : backwardmap;
  const keys = map.get(key)!;

  for (const nextKey of keys) {
    const nodesid = transformmap.get(isForward ? key + nextKey : nextKey + key);
    const nodeid = arccentermap.get(nodesid!)![0];
    const arcNode = arcnodemap.get(nodeid);

    if (!arcNode) continue;

    const center = transformer.ofPoint(arcNode.center);
    const normal = arcNode.normal;
    const angle = arcNode.angle;
    const rangle = isForward ? angle! * Math.PI / 180 : -angle! * Math.PI / 180;

    const newTransformer = transformer.multiply(Matrix4.createRotationAt(center, normal!, rangle));

    // 推入队列
    queue.push({ currentKey: nextKey, currenttransformer: newTransformer });

    // 解析边数据并绘制线段
    const edges: { start: string; end: string }[] = JSON.parse(nextKey);
    drawLines(edges, newTransformer);
  }
}

function drawLines(edges: { start: string; end: string }[], transformer: Matrix4) {
  for (const { start, end } of edges) {
    const [sx, sy, sz] = start.split('-').map(Number);
    const [ex, ey, ez] = end.split('-').map(Number);

    const startxyz = new XYZ(sx, sy, sz);
    const endxyz = new XYZ(ex, ey, ez);

    const startTrans = transformer.ofPoint(startxyz);
    const endTrans = transformer.ofPoint(endxyz);

    PubSub.default.pub("njsgcs_makeline",
      startTrans.x, startTrans.y, startTrans.z + 50,
      endTrans.x, endTrans.y, endTrans.z + 50, 1
    );
  }
}
// 将其转换为原始结构并取第一个元素
if (singleOccurrenceKeys.length > 0) {
  let firstKey = singleOccurrenceKeys[0]; // 取第一个 key
    let edges:{ start: string, end: string }[]=JSON.parse(firstKey!);           
         for (const {start, end} of edges) {
             const [startx, starty, startz] = start.split('-').map(Number); 
             const startxyz = new XYZ(startx, starty, startz);
         
             const [endx, endy, endz] = end.split('-').map(Number);
             const endxyz = new XYZ(endx, endy, endz);
 
   PubSub.default.pub("njsgcs_makeline",
        startxyz.x,startxyz.y,startxyz.z+50,endxyz.x,endxyz.y,endxyz.z+50, 1
    );}

 let totaltransformer = Matrix4.identity();
 

const queue = [{ currentKey: firstKey, currenttransformer: totaltransformer }];
const visited = new Set<string>();

while (queue.length > 0) {
  let { currentKey, currenttransformer } = queue.shift()!;

  if (visited.has(currentKey)) continue;

  if (forwardmap.has(currentKey)) {
    processKey(currentKey, currenttransformer, true, queue, visited);
  } else if (backwardmap.has(currentKey)) {
    processKey(currentKey, currenttransformer, false, queue, visited);
  }
}

} else {
  console.log("没有出现次数为 1 的结构");
}
}


