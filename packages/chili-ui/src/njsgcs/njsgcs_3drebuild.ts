import { Logger, PubSub } from "chili-core";
import DxfParser, { IArcEntity, ILineEntity } from 'dxf-parser';
class Cluster {
    lines: [number, number, number, number,number][];
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;

    constructor(lines: [number, number, number, number,number][] = []) {
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
function clusterLines(lines: [number, number, number, number,number][], expandDistance: number = 5): Cluster[] {
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

            const toAdd: [number, number, number, number,number][] = [];

            for (const line of [...remainingLines]) {
                const [x1, y1, x2, y2,type] = line;
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
export function rebuild3D(document: Document) {
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

                const inputlines: [number, number, number, number,number][] = [];

                if (dxf && dxf.entities) {
                    dxf.entities.forEach(entity => {
                        if (entity.type === 'LINE') {
                            const lineEntity = entity as ILineEntity;
                            const start = lineEntity.vertices[0];
                            const end = lineEntity.vertices[1];

                            if (start && end) {
                                inputlines.push([start.x, start.y, end.x, end.y,0]);
                            }
                        }else if (entity.type === 'Arc') {
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

inputlines.push([startX, startY, center.x, center.y, 1]);

                            
                                inputlines.push([startX, startY, endX, endY,1]);
                            
                        }
                    });
                }

                // 执行聚类
                const clusters = clusterLines(inputlines, 5);
                const lines3d:[number,number,number,number,number,number,number][]=[]
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
                  const seen = new Set<string>(); // 用于记录已经添加过的线段
               function addUniqueLine(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number,color:number) {
    const key = `${x1},${y1},${z1},${x2},${y2},${z2}`;
    if (!seen.has(key)) {
        seen.add(key);
        lines3d.push([x1, y1, z1, x2, y2, z2,color]);
    }
} 
const clusterMinY = topcluauster.min_y;

// 构建点存在性查询的 Map
const pointToLinesMap = new Map<string, boolean>();
topcluauster.lines.forEach(([tx1, ty1, tx2, ty2]) => {
    pointToLinesMap.set(`${tx1},${ty1}`, true);
    pointToLinesMap.set(`${tx2},${ty2}`, true);
});

// 判断某点是否存在于 topcluauster 中
function isPointInTopCluster(x: number, y: number): boolean {
    return pointToLinesMap.has(`${x},${y}`);
}

// 主处理逻辑
for (const [x1, y1, x2, y2,type] of mostFrequentCluster.lines) {
    for (const [tx1, ty1, tx2, ty2,type] of topcluauster.lines) {
        // 判断 (x1, ty1) 和 (x2, ty2) 是否在 topcluauster 的线段中
        const p1Exists = isPointInTopCluster(x1, ty1);
        const p2Exists = isPointInTopCluster(x2, ty2);
                
                const offset1 = ty1 - clusterMinY;
            const offset2 = ty2 - clusterMinY;
        if (p1Exists && p2Exists) {
             
           
            if(x1==x2&&x1==tx1){

                  addUniqueLine(x1, y1, offset1, x2, y2, offset1, 1);
        
            }
            else if(x1==x2&&x1==tx2){
                  addUniqueLine(x1, y1, offset2, x2, y2, offset2, 1);
            }
            else if(x1==tx1&&x2==tx2){ addUniqueLine(x1, y1, offset1, x2, y2, offset2, 1);

               
            }
          
}
         
         if (ty1 !== ty2 && (x1 === tx1 && tx1 === tx2 )) {
                         
         
                addUniqueLine(x1, y1, offset1, x1, y1, offset2, 1);
               
            }
                     if (ty1 !== ty2 && ( x2 === tx1 && tx1 === tx2)) {
                   
             addUniqueLine(x2, y2, offset1, x2, y2, offset2, 1);
                     }
    }
}
Logger.info(`lines3d completed with ${lines3d.length} lines3d`);
                 lines3d.forEach(line => {

                PubSub.default.pub("njsgcs_makeline", line[0], line[1],  line[2], line[3], line[4], line[5],1); 
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
                Logger.info(`Clustering completed with ${clusters.length} clusters`);
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