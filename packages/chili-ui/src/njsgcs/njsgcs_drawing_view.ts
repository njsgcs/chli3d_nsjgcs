import { GeometryNode, IApplication, Logger, PubSub } from "chili-core";
import { initWasm } from "chili-wasm";
export class njsgcs_drawingView extends HTMLElement {
    private viewportCanvas2d: HTMLCanvasElement | null = null;
    private app: IApplication | null = null;

    constructor() {
        super();
        PubSub.default.sub("njsgcs_drawview", (app: IApplication) => {
            Logger.info("njsgcs_drawview event triggered");
            if (this.viewportCanvas2d) {
                this.removeChild(this.viewportCanvas2d);
                this.viewportCanvas2d = null;
            }
           
            initWasm().then((module) => {
              
              Logger.info(module.HelloWorld.sayHello());
            });
            this.app = app;
            const canvas = this.createCanvas();
            this.appendChild(canvas);
        });
    }

    private createCanvas() {
        if (!this.viewportCanvas2d) {
            this.viewportCanvas2d = document.createElement("canvas");
            this.viewportCanvas2d.width = 900;
            this.viewportCanvas2d.height = 600;
            this.viewportCanvas2d.style.border = "1px solid #000";

            const ctx = this.viewportCanvas2d.getContext("2d");
            if (ctx) {
                const points = this.getSelectedEntityEdgePoints();

                if (points.length > 0) {
                    // 清空画布
                    ctx.clearRect(0, 0, 900, 600);
                    ctx.strokeStyle = "black";
                    ctx.lineWidth = 1;

                    // 绘制三个视图
                    this.drawFrontView(ctx, points, 150, 150); // 正视图
                    this.drawTopView(ctx, points, 450, 150); // 俯视图
                    this.drawRightView(ctx, points, 150, 400); // 右视图
                }
            }
        }
        return this.viewportCanvas2d;
    }

    private getSelectedEntityEdgePoints(): number[] {
        const document = this.app!.activeView?.document;
        if (!document) return [];

        const geometries = document.selection.getSelectedNodes();
        const entities = geometries.filter((x) => x instanceof GeometryNode);

        let allPoints: number[] = [];
        for (const entity of entities) {
            const mesh = entity.mesh;
            if (mesh.edges?.positions) {
                // 应用变换矩阵获取世界坐标
                const worldPositions = entity.transform.ofPoints(mesh.edges.positions);
                allPoints.push(...worldPositions);
            }
        }
        return allPoints;
    }

    // 正视图：XY平面投影
    private drawFrontView(
        ctx: CanvasRenderingContext2D,
        points: number[],
        offsetX: number,
        offsetY: number,
    ) {
        const edges = this.extractEdgesFromPoints(points);
        const projectedEdges = edges.map((edge) => ({
            start: { x: edge.start.x, y: edge.start.y },
            end: { x: edge.end.x, y: edge.end.y },
        }));

        this.drawView(ctx, projectedEdges, offsetX, offsetY, "正视图");
    }

    // 俯视图：XZ平面投影（Z映射到Y轴）
    private drawTopView(ctx: CanvasRenderingContext2D, points: number[], offsetX: number, offsetY: number) {
        const edges = this.extractEdgesFromPoints(points);
        const projectedEdges = edges.map((edge) => ({
            start: { x: edge.start.x, y: edge.start.z },
            end: { x: edge.end.x, y: edge.end.z },
        }));

        this.drawView(ctx, projectedEdges, offsetX, offsetY, "俯视图");
    }

    // 右视图：YZ平面投影（Z映射到X轴）
    private drawRightView(
        ctx: CanvasRenderingContext2D,
        points: number[],
        offsetX: number,
        offsetY: number,
    ) {
        const edges = this.extractEdgesFromPoints(points);
        const projectedEdges = edges.map((edge) => ({
            start: { x: edge.start.z, y: edge.start.y },
            end: { x: edge.end.z, y: edge.end.y },
        }));

        this.drawView(ctx, projectedEdges, offsetX, offsetY, "右视图");
    }

    // 从点数组中提取边信息
    private extractEdgesFromPoints(
        points: number[],
    ): Array<{ start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number } }> {
        const edges = [];
        for (let i = 0; i < points.length; i += 6) {
            edges.push({
                start: { x: points[i], y: points[i + 1], z: points[i + 2] },
                end: { x: points[i + 3], y: points[i + 4], z: points[i + 5] },
            });
        }
        return edges;
    }

    // 绘制单个视图
    private drawView(
        ctx: CanvasRenderingContext2D,
        edges: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>,
        offsetX: number,
        offsetY: number,
        title: string,
    ) {
        if (edges.length === 0) return;

        // 过滤重复边
        const uniqueEdges = this.filterDuplicateEdges(edges);

        // 计算边界框
        let minX = Infinity,
            maxX = -Infinity,
            minY = Infinity,
            maxY = -Infinity;
        for (const edge of uniqueEdges) {
            minX = Math.min(minX, edge.start.x, edge.end.x);
            maxX = Math.max(maxX, edge.start.x, edge.end.x);
            minY = Math.min(minY, edge.start.y, edge.end.y);
            maxY = Math.max(maxY, edge.start.y, edge.end.y);
        }

        // 计算缩放比例
        const viewSize = 100;
        const scaleX = maxX - minX > 0 ? viewSize / (maxX - minX) : 1;
        const scaleY = maxY - minY > 0 ? viewSize / (maxY - minY) : 1;
        const scale = Math.min(scaleX, scaleY) * 0.8; // 留一些边距

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // 绘制标题
        ctx.fillStyle = "black";
        ctx.font = "12px Arial";
        ctx.fillText(title, offsetX - 20, offsetY - 70);

        // 绘制边
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 1;

        for (const edge of uniqueEdges) {
            const x1 = (edge.start.x - centerX) * scale + offsetX;
            const y1 = -(edge.start.y - centerY) * scale + offsetY; // Y轴翻转
            const x2 = (edge.end.x - centerX) * scale + offsetX;
            const y2 = -(edge.end.y - centerY) * scale + offsetY; // Y轴翻转

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    // 过滤重复边
    private filterDuplicateEdges(
        edges: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>,
    ): Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> {
        const uniqueEdges: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> = [];
        const tolerance = 0.001;

        for (const edge of edges) {
            const isDuplicate = uniqueEdges.some((existingEdge) =>
                this.areEdgesEqual(edge, existingEdge, tolerance),
            );

            if (!isDuplicate) {
                uniqueEdges.push(edge);
            }
        }

        return uniqueEdges;
    }

    // 判断两条边是否相等（考虑方向）
    private areEdgesEqual(
        edge1: { start: { x: number; y: number }; end: { x: number; y: number } },
        edge2: { start: { x: number; y: number }; end: { x: number; y: number } },
        tolerance: number,
    ): boolean {
        // 正向比较
        const dist1 =
            Math.abs(edge1.start.x - edge2.start.x) +
            Math.abs(edge1.start.y - edge2.start.y) +
            Math.abs(edge1.end.x - edge2.end.x) +
            Math.abs(edge1.end.y - edge2.end.y);

        // 反向比较
        const dist2 =
            Math.abs(edge1.start.x - edge2.end.x) +
            Math.abs(edge1.start.y - edge2.end.y) +
            Math.abs(edge1.end.x - edge2.start.x) +
            Math.abs(edge1.end.y - edge2.start.y);

        return dist1 < tolerance || dist2 < tolerance;
    }
}

customElements.define("njsgcs-drawing-view", njsgcs_drawingView);
