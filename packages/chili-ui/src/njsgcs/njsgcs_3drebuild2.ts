import { Logger, PubSub } from "chili-core";
import DxfParser, { IArcEntity, ICircleEntity, IEntity, ILineEntity, ISplineEntity } from 'dxf-parser';
class Cluster {
    lines: [number, number, number, number,number,number][];
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;

    constructor(lines: [number, number, number, number,number,number][] = []) {
        this.lines = [...lines];
        this.min_x = Infinity;
        this.max_x = -Infinity;
        this.min_y = Infinity;
        this.max_y = -Infinity;

        if (lines.length > 0) {
            this.updateBounds();
        }
    }

    updateBounds(): void {
        this.min_x = Math.min(...this.lines.flatMap(line => [line[0], line[2]]));
        this.max_x = Math.max(...this.lines.flatMap(line => [line[0], line[2]]));
        this.min_y = Math.min(...this.lines.flatMap(line => [line[1], line[3]]));
        this.max_y = Math.max(...this.lines.flatMap(line => [line[1], line[3]]));
    }

    get lengthX(): number {
        return parseFloat((this.max_x - this.min_x).toFixed(1));
    }

    get lengthY(): number {
        return parseFloat((this.max_y - this.min_y).toFixed(1));
    }
}
function clusterLines(lines: [number, number, number, number,number,number][], expandDistance: number = 5): Cluster[] {
    const clusters: Cluster[] = [];
    const remainingLines = [...lines];

    while (remainingLines.length > 0) {
        const seed = remainingLines.shift()!;
        const currentCluster = new Cluster([seed]);
        currentCluster.updateBounds();

        let changed = true;

        while (changed) {
            changed = false;
            const expandedMinX = currentCluster.min_x - expandDistance;
            const expandedMaxX = currentCluster.max_x + expandDistance;
            const expandedMinY = currentCluster.min_y - expandDistance;
            const expandedMaxY = currentCluster.max_y + expandDistance;

            const toAdd: [number, number, number, number,number,number][] = [];

            for (const line of [...remainingLines]) {
                const [x1, y1, x2, y2,lineId,type] = line;
                const inBound =
                    (x1 >= expandedMinX && x1 <= expandedMaxX && y1 >= expandedMinY && y1 <= expandedMaxY) ||
                    (x2 >= expandedMinX && x2 <= expandedMaxX && y2 >= expandedMinY && y2 <= expandedMaxY);

                if (inBound) {
                    toAdd.push(line);
                    changed = true;
                }
            }

            for (const line of toAdd) {
                currentCluster.lines.push(line);
                remainingLines.splice(remainingLines.indexOf(line), 1);
            }

            currentCluster.updateBounds();
        }

        // 合并完全覆盖的聚类
        for (let i = 0; i < clusters.length; i++) {
            const cluster = clusters[i];
            if (
                currentCluster.min_x <= cluster.min_x &&
                currentCluster.min_y <= cluster.min_y &&
                currentCluster.max_x >= cluster.max_x &&
                currentCluster.max_y >= cluster.max_y
            ) {
                currentCluster.lines.push(...cluster.lines);
                clusters.splice(i, 1);
                break;
            }
        }

        clusters.push(currentCluster);
    }

    return clusters;
}
export function rebuild3D2(document: Document) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".dxf";
    fileInput.style.display = "none";

    fileInput.addEventListener("change", async (event) => {
        const target = event.target as HTMLInputElement;

        if (!target.files || target.files.length === 0) return;

        const file = target.files[0];
        Logger.info(`Selected file: ${file.name}`);

        try {
            const reader = new FileReader();
            reader.onload = () => {
                const dxfText = reader.result as string;
                const parser = new DxfParser();
                const dxf = parser.parseSync(dxfText);

                const inputlines: [number, number, number, number,number,number][] = [];
const lineMap = new Map<number, IEntity>(); 

let lineId = 0;
                if (dxf && dxf.entities) {
                    dxf.entities.forEach(entity => {
                        if (entity.type === 'LINE') {
                            const lineEntity = entity as ILineEntity;
                            const start = lineEntity.vertices[0];
                            const end = lineEntity.vertices[1];

                            if (start && end) {
                                    lineMap.set(lineId, entity);
                                    
                                  
                                inputlines.push([start.x, start.y, end.x, end.y, lineId,0]);
                                lineId++;
                            }
                        }else if (entity.type === 'ARC') {
                             lineMap.set(lineId, entity);
                            const arcEntity = entity as IArcEntity;
                         const center = arcEntity.center;
const radius = arcEntity.radius;
const startAngle = arcEntity.startAngle;
const endAngle = arcEntity.endAngle;
// 计算起点坐标
const startX = center.x + radius * Math.cos(startAngle);
const startY = center.y + radius * Math.sin(startAngle);

// 假设终点角度为 endAngle，则可以类似计算终点
 const endX = center.x + radius * Math.cos(endAngle);
 const endY = center.y + radius * Math.sin(endAngle);



                                inputlines.push([startX, startY, endX, endY,lineId,1]);
                                Logger.info(`Arc: ${startX}, ${startY}, ${endX}, ${endY}`);
                              lineId++;
                        }
                        else if (entity.type=="SPLINE"){
                         
   lineMap.set(lineId, entity);
                           const splineEntity = entity as ISplineEntity ;
                             if (splineEntity.controlPoints && splineEntity.controlPoints.length > 0) {
                              
                              const controlPoints = splineEntity.controlPoints;
                          
                              // 将控制点头尾相连画线
                            
                                const start = controlPoints[0];
                                const end = controlPoints[controlPoints.length - 1];
                          
                             
                                inputlines.push([start.x,start.y,end.x,end.y,lineId,0]);
                              lineId++;
                        }}
                        else if(entity.type=="CIRCLE"){
                           lineMap.set(lineId, entity);
                          const circleEntity = entity as ICircleEntity;
                          const center = circleEntity.center;
                          const radius = circleEntity.radius;
                          const startx=center.x-radius;
                          const starty=center.y-radius;
                          const endx=center.x+radius;
                          const endy=center.y+radius;
                          inputlines.push([startx, starty, endx, endy,lineId,2]);
                          lineId++;

                        }else{
                          Logger.info(`Unsupported entity type: ${entity.type}`);
                        }

                    });
                }

                // 执行聚类
                const clusters = clusterLines(inputlines, 5);
                 Logger.info(`Clustering completed with ${clusters.length} clusters`);
                const { mostMinX, mostMinY } = getMostFrequentMinXY(clusters);
                const mostFrequentClusters = clusters.filter(cluster => {
    return cluster.min_x === mostMinX.value && cluster.min_y === mostMinY.value;
});
const topclusters = clusters.filter(cluster => {
    return cluster.min_x === mostMinX.value && cluster.min_y > mostMinY.value;
});
;
const rightclusters = clusters.filter(cluster => {
    return cluster.min_x > mostMinX.value && cluster.min_y === mostMinY.value;
});
const bottomclusters = clusters.filter(cluster => {
    return cluster.min_x === mostMinX.value && cluster.min_y < mostMinY.value;
});
const leftclusters = clusters.filter(cluster => {
    return cluster.min_x < mostMinX.value && cluster.min_y === mostMinY.value;
});
              const mostFrequentCluster= mostFrequentClusters[0];
               const topcluauster= topclusters[0];
               const rightcluster= rightclusters[0];
               const bottomcluster= bottomclusters[0];
               const leftcluster= leftclusters[0];
           
const frontlinelist: [number, number, number,number, number, number][] = [];
const toplinelist: [number, number, number,number, number, number][] = [];
const rightlinelist: [number, number, number,number, number, number][] = [];

const frontpointlist: [number, number][] = [];
const toppointlist: [number, number][] = [];
const rightpointlist: [number, number][] = [];
const clusterMinY = topcluauster.min_y;
const clusterMinx= rightcluster.min_x;
function formatKey(x1: number, y1: number, x2: number, y2: number): string {
    return `${x1},${y1},${x2},${y2}`;
}

const fseen = new Set<string>();
const tseen = new Set<string>();
const rseen = new Set<string>();

for (const [x1, y1, x2, y2,lineId,type] of mostFrequentCluster.lines) {
     

  

    const x1f = parseFloat(x1.toFixed(1));
    const y1f = parseFloat(y1.toFixed(1));
    const x2f = parseFloat(x2.toFixed(1));
    const y2f = parseFloat(y2.toFixed(1));


    
frontlinelist.push([x1f, y1f, x2f, y2f,lineId,type]);


addUniquePoint(x1f, y1f, frontpointlist, fseen);
addUniquePoint(x2f, y2f, frontpointlist, fseen);


 
}
for (const [x1, y1, x2, y2,lineId,type] of topcluauster.lines) {
     

        const x1f = parseFloat(x1.toFixed(1));
    const y1f = parseFloat((y1- clusterMinY).toFixed(1));
    const x2f = parseFloat(x2.toFixed(1));
    const y2f = parseFloat(( y2- clusterMinY).toFixed(1));


toplinelist.push([x1f, y1f, x2f, y2f,lineId,type]);

addUniquePoint(x1f, y1f, toppointlist, tseen);
addUniquePoint(x2f, y2f, toppointlist, tseen);





}
 
for (const [x1, y1, x2, y2,lineId,type] of rightcluster.lines) {
  
   
          const x1f = parseFloat((x1-clusterMinx).toFixed(1));
    const y1f = parseFloat(y1.toFixed(1));
    const x2f = parseFloat((x2-clusterMinx).toFixed(1));
    const y2f = parseFloat(y2.toFixed(1));

     rightlinelist.push([x1f, y1f, x2f, y2f,lineId,type]);

     addUniquePoint(x1f, y1f, rightpointlist, rseen);
     addUniquePoint(x2f, y2f, rightpointlist, rseen);
   
  
    

}
Logger.info("2d线段和点收集完毕" )
Logger.info("frontlinelist:",frontlinelist)
Logger.info("toplinelist:",toplinelist)
Logger.info("rightlinelist:",rightlinelist)
Logger.info(`主视图有${frontlinelist.length}条线段`, `顶视图有${toplinelist.length}条线段`, `右视图有${rightlinelist.length}条线段`);
Logger.info(`主视图有${frontpointlist.length}个点`, `顶视图有${toppointlist.length}个点`, `右视图有${rightpointlist.length}个点`);

// Logger.info(`rightarcmap:`)
// for (const [key, value] of rightarcmap.entries()) {
//   Logger.info(`${key}: ${value}`);
// }
function addUniquePoint(
  x: number,
  y: number,
  pointList: [number, number][],
  seen: Set<string>
): void {
  const key = `${x},${y}`;
  if (!seen.has(key)) {
    seen.add(key);
    pointList.push([x, y]);
  }
}

const point3dlist: [number, number, number][] = [];
const seen = new Set<string>(); // 用于去重

for (const [fx1, fy1] of frontpointlist) {
  for (const [tx1, ty1] of toppointlist) {
    if (fx1 === tx1) {
      const key = `${fx1},${fy1},${ty1}`;
      if (!seen.has(key)) {
        seen.add(key);
        point3dlist.push([fx1, fy1, ty1]);
      }
    }
  }
}
Logger.info(`3d点生成完毕，个数${point3dlist.length}`)


function isPointOnLineSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  const crossProduct = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1);
  if (Math.abs(crossProduct) > Number.EPSILON) return false;

  const dotProduct = (px - x1) * (x2 - x1) + (py - y1) * (y2 - y1);
  if (dotProduct < 0) return false;

  const squaredLength = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  return dotProduct <= squaredLength;
}
function makemap(
  lines: [number, number, number, number, number, number][],
  points: [number, number][],
  map: Map<string, {lineid:number,type:number}>
): void {
  for (const [x1, y1, x2, y2,lineId,type] of lines) {
    const relevantPoints: [number, number][] = [];

    for (const [px, py] of points) {
      if (isPointOnLineSegment(px, py, x1, y1, x2, y2)) {
        // 保留一位小数
        const pxFixed = parseFloat(px.toFixed(1));
        const pyFixed = parseFloat(py.toFixed(1));

        relevantPoints.push([pxFixed, pyFixed]);
        const key = `${pxFixed},${pyFixed},${pxFixed},${pyFixed}`;
      if(type==0) map.set(key, {lineid:lineId,type:type});
      }
    }

    // 两两连接相关点
    for (let i = 0; i < relevantPoints.length; i++) {
      for (let j = i + 1; j < relevantPoints.length; j++) {
        const [p1x, p1y] = relevantPoints[i];
        const [p2x, p2y] = relevantPoints[j];

        // 保留一位小数
        const p1xFixed = parseFloat(p1x.toFixed(1));
        const p1yFixed = parseFloat(p1y.toFixed(1));
        const p2xFixed = parseFloat(p2x.toFixed(1));
        const p2yFixed = parseFloat(p2y.toFixed(1));

        const key1 = `${p1xFixed},${p1yFixed},${p2xFixed},${p2yFixed}`;
        const key2 = `${p2xFixed},${p2yFixed},${p1xFixed},${p1yFixed}`;

        map.set(key1, {lineid:lineId,type:type});
        map.set(key2,  {lineid:lineId,type:type});
      }
    }
  }
}

const frontmap=new Map<string,{lineid:number,type:number}>();
makemap(frontlinelist,frontpointlist,frontmap);
Logger.info(`frontmap completed with ${frontmap.size} pairs`);
const toppointmap=new Map<string,{lineid:number,type:number}>();
makemap(toplinelist,toppointlist,toppointmap);
Logger.info(`toppointmap completed with ${toppointmap.size} pairs`);
const rightpointmap=new Map<string,{lineid:number,type:number}>();
makemap(rightlinelist,rightpointlist,rightpointmap);
Logger.info(`rightpointmap completed with ${rightpointmap.size} pairs`);
// Logger.info("rightpointmap 内容如下：");
// for (const [key, value] of rightpointmap.entries()) {
//   Logger.info(`${key}: lineid=${value.lineid},type=${value.type}`);
// }
 const lines3d:[number,number,number,number,number,number,number,number,number,number][]=[]




const seenLinePairs = new Set<string>(); // 用于记录已经添加过的 [lineId, lineId2] 对
function drawlines(x1:number, y1:number, z1:number , x2:number, y2:number, z2:number , lineId:number, type:number,color:number,viewid:number){
 if([x1, y1, z1].join(',') === [x2, y2, z2].join(','))
    return;
   
    const drawline2=[x1, y1, z1 , x2, y2,z2]
            const key2 = drawline2.map(v => v.toFixed(1)).join(',');
            if (!seenLinePairs.has(key2)) {
                seenLinePairs.add(key2);
               // Logger.info(`key2: ${key2} drawtype2:${type}`);
            lines3d.push([x1, y1, z1, x2, y2, z2 , lineId, type,color,viewid]);
            }
}
for (const [x1, y1, z1] of point3dlist) {
  for (const [x2, y2, z2] of point3dlist) {
    if (x1 === x2 && y1 === y2 && z1 === z2) continue;

    // 保留一位小数
    const x1f = parseFloat(x1.toFixed(1));
    const y1f = parseFloat(y1.toFixed(1));
    const z1f = parseFloat(z1.toFixed(1));
    const x2f = parseFloat(x2.toFixed(1));
    const y2f = parseFloat(y2.toFixed(1));
    const z2f = parseFloat(z2.toFixed(1));

    const frontKey = formatKey(x1f,y1f,x2f,y2f);
    const topKey =  formatKey(x1f,z1f,x2f,z2f);
     const rightKey = formatKey(z1f,y1f,z2f,y2f);

     const existinfront = frontmap.get(frontKey);
     const existintop = toppointmap.get(topKey);
     const existinright = rightpointmap.get(rightKey);
    if (existinfront&&existintop&&existinright) {


  const frontlineId = existinfront.lineid;
  const fronttype= existinfront.type;
  //Logger.info(`frontlineId:${frontlineId},fronttype:${fronttype}`);


  const toplineId = existintop.lineid;
  const toptype= existintop.type;
 // Logger.info(`toplineId:${toplineId},toptype:${toptype}`);
 


  const rightlineId = existinright.lineid;
  const righttype= existinright.type;
 // Logger.info(`rightlineId:${rightlineId},righttype:${righttype}`);
  
const drawCommands = [
  { type: fronttype, draw: () => drawlines(x1f, y1f, z1f, x2f, y2f, z2f, frontlineId, fronttype, 1, 0) },
  { type: toptype, draw: () => drawlines(x1f, y1f, z1f, x2f, y2f, z2f, toplineId, toptype, 1, 1) },
  { type: righttype, draw: () => drawlines(x1f, y1f, z1f, x2f, y2f, z2f, rightlineId, righttype, 1, 2) }
];

// 按照 type 大小排序
drawCommands.sort((a, b) => b.type-a.type );

// 依次执行排序后的 drawlines 调用
drawCommands.forEach(command => command.draw());

}}}


            
Logger.info(`lines3d completed with ${lines3d.length} lines3d`);
                 lines3d.forEach(line => {
                const [x1, y1, z1, x2, y2, z2, lineId, type,color,viewid] = line;
           
                if(type===0){
                PubSub.default.pub("njsgcs_makeline", line[0], line[1],  line[2], line[3], line[4], line[5], line[8]); 
            }else if(type===1){
              const entity=lineMap.get(lineId);
                
                            const arcEntity = entity as IArcEntity;
                          
                           const angleDelta = (arcEntity.endAngle-arcEntity.startAngle )*180/Math.PI;
                         const center = arcEntity.center;
                         const radius = arcEntity.radius;
                  
     if(viewid==2){
const centerx=center.x-clusterMinx;
const centery=center.y;
const startX = centerx + radius * Math.cos(arcEntity.startAngle);
const startY = center.y + radius * Math.sin(arcEntity.startAngle);
const endX = centerx + radius * Math.cos(arcEntity.endAngle);
    const endY = center.y + radius * Math.sin(arcEntity.endAngle);
    if(startX==z1&&startY==y1&&endX==z2&&endY==y2)PubSub.default.pub("njsgcs_makearc", 1,0,0, x1,centery,centerx,x1, y1, z1,-(angleDelta+360)); 
       
     }
     else if(viewid==0){
const endX = center.x + radius * Math.cos(arcEntity.endAngle);
    const endY = center.y + radius * Math.sin(arcEntity.endAngle);
    const startX = center.x + radius * Math.cos(arcEntity.startAngle);
     const startY = center.y + radius * Math.sin(arcEntity.startAngle);
    // Logger.info(`startX:${startX} startY:${startY} endX:${endX} endY:${endY}`);
    // Logger.info(`x1:${x1} y1:${y1} x2:${x2} y2:${y2}`)
if(startX==x1&&startY==y1&&endX==x2&&endY==y2)PubSub.default.pub("njsgcs_makearc", 0,0,1, center.x,center.y,z1,x1, y1, z1,angleDelta+360); 
     }
     else if(viewid==1){
      const centerx=center.x;
const centery= center.y-clusterMinY;
const startX = centerx + radius * Math.cos(arcEntity.startAngle);
const startY = centery + radius * Math.sin(arcEntity.startAngle);
const endX = center.x + radius * Math.cos(arcEntity.endAngle);
    const endY =centery + radius * Math.sin(arcEntity.endAngle);
      //  Logger.info(`startX:${startX} startY:${startY} endX:${endX} endY:${endY}`);
   // Logger.info(`x1:${x1} y1:${z1} x2:${x2} y2:${z2}`)
if(startX==x1&&startY==z1&&endX==x2&&endY==z2)PubSub.default.pub("njsgcs_makearc", 0,1,0, centerx,y1,centery,x1, y1, z1,-(angleDelta+360)); 
     }

               
            }
            else if(type==2){
    const entity=lineMap.get(lineId);
    const circleEntity=entity as ICircleEntity;
    const center = circleEntity.center;
    const radius = circleEntity.radius;
    if (viewid==0){
      PubSub.default.pub("njsgcs_makecircle", 0,0,1, center.x,center.y,z1,radius);
    }else if(viewid==1){
         const centerx=center.x;
const centery= center.y-clusterMinY;
      PubSub.default.pub("njsgcs_makecircle", 0,1,0, centerx,y1,centery,radius);
    }
    else if(viewid==2){
      const centerx=center.x-clusterMinx;
      const centery= center.y;
      PubSub.default.pub("njsgcs_makecircle", 1,0,0, x1,centery,centerx,radius);
    }


            }
              })
             ///////////////////////////////
                // let i =0;
                // // 发送每个线段给 njsgcs_makeline
                // clusters.forEach(cluster => {
                //     i++;
                //     cluster.lines.forEach(line => {
                //         const [x1, y1, x2, y2] = line;
                //         PubSub.default.pub("njsgcs_makeline", x1, y1, 0, x2, y2, 0,i); // z=0 假设为俯视图
                //     });
                // });
  ///////////////////////////////
             
            };

            reader.readAsText(file);
        } catch (error) {
            Logger.error("Error reading file:", error);
        }
    });

    fileInput.click();
}
function getMostFrequentMinXY(clusters: Cluster[]) {
    const minXCounts: Record<number, number> = {};
    const minYCounts: Record<number, number> = {};

    let maxXCount = 0, mostX = clusters[0]?.min_x;
    let maxYCount = 0, mostY = clusters[0]?.min_y;

    for (const cluster of clusters) {
        const x = cluster.min_x;
        const y = cluster.min_y;

        minXCounts[x] = (minXCounts[x] || 0) + 1;
        if (minXCounts[x] > maxXCount) {
            maxXCount = minXCounts[x];
            mostX = x;
        }

        minYCounts[y] = (minYCounts[y] || 0) + 1;
        if (minYCounts[y] > maxYCount) {
            maxYCount = minYCounts[y];
            mostY = y;
        }
    }

    return {
        mostMinX: { value: mostX, count: maxXCount },
        mostMinY: { value: mostY, count: maxYCount }
    };
}