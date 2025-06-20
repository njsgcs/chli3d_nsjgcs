import { Logger, PubSub } from "chili-core";
import DxfParser, { ILineEntity } from 'dxf-parser';
class Cluster {
    lines: [number, number, number, number][];
    min_x: number;
    max_x: number;
    min_y: number;
    max_y: number;

    constructor(lines: [number, number, number, number][] = []) {
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
function clusterLines(lines: [number, number, number, number][], expandDistance: number = 5): Cluster[] {
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

            const toAdd: [number, number, number, number][] = [];

            for (const line of [...remainingLines]) {
                const [x1, y1, x2, y2] = line;
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

                const inputlines: [number, number, number, number][] = [];

                if (dxf && dxf.entities) {
                    dxf.entities.forEach(entity => {
                        if (entity.type === 'LINE') {
                            const lineEntity = entity as ILineEntity;
                            const start = lineEntity.vertices[0];
                            const end = lineEntity.vertices[1];

                            if (start && end) {
                                inputlines.push([start.x, start.y, end.x, end.y]);
                            }
                        }
                    });
                }

                // 执行聚类
                const clusters = clusterLines(inputlines, 5);
               let i =0;
                // 发送每个线段给 njsgcs_makeline
                clusters.forEach(cluster => {
                    i++;
                    cluster.lines.forEach(line => {
                        const [x1, y1, x2, y2] = line;
                        PubSub.default.pub("njsgcs_makeline", x1, y1, 0, x2, y2, 0,i); // z=0 假设为俯视图
                    });
                });

                Logger.info(`Clustering completed with ${clusters.length} clusters`);
            };

            reader.readAsText(file);
        } catch (error) {
            Logger.error("Error reading file:", error);
        }
    });

    fileInput.click();
}