import { IApplication, Logger, PubSub, ShapeNode } from "chili-core";
import { getProjectionEdges, gp_Pnt, LineSegmentList, OccShape, ProjectionResult2 } from "chili-wasm";


interface Segment {
    first: gp_Pnt;
    second: gp_Pnt;
}



export class njsgcs_drawingView extends HTMLElement {
    private viewportCanvas2d: HTMLCanvasElement | null = null;
    private app: IApplication | null = null;
  
    constructor() {
        super();
        PubSub.default.sub("njsgcs_drawview", async (app: IApplication) => {
            Logger.info("njsgcs_drawview event triggered");
            if (this.viewportCanvas2d) {
                this.removeChild(this.viewportCanvas2d);
                this.viewportCanvas2d = null;
            }

           

            this.app = app;
            const canvas = this.createCanvas();
            this.appendChild(canvas);
        });
    }
    private drawProjectionEdges(ctx: CanvasRenderingContext2D, projection: ProjectionResult2) {
        // 清除画布
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
        // 获取所有线段并合并用于自动缩放计算
        const allSegments = [
            ...this.toArray(projection.f_visible),
            ...this.toArray(projection.f_hidden),
            ...this.toArray(projection.s_visible),
            ...this.toArray(projection.s_hidden),
            ...this.toArray(projection.t_visible),
            ...this.toArray(projection.t_hidden),
        ];
    
        // 自动计算缩放和偏移
        const { minX, maxX, minY, maxY } = this.calculateBounds(allSegments);
        const margin = 50;
        const availableWidth = ctx.canvas.width ;
        const availableHeight = ctx.canvas.height ;
    
        const scaleX = availableWidth / (maxX - minX || 1);
        const scaleY = availableHeight / (maxY - minY || 1);
        const scale = Math.min(scaleX, scaleY) * 0.9; // 留点边距

    
        // 定义各视图偏移
        const views = [
            {
                name: 'front',
                segmentsVisible: this.toArray(projection.f_visible),
                segmentsHidden: this.toArray(projection.f_hidden),
                offset: { x: margin, y: margin },
            },
            { 
                name: 'side',
                segmentsVisible: this.toArray(projection.s_visible),
                segmentsHidden: this.toArray(projection.s_hidden),
                offset: { x: availableWidth  -maxX*scale , y:  margin  },
            },
            {
                name: 'top',
                segmentsVisible: this.toArray(projection.t_visible),
                segmentsHidden: this.toArray(projection.t_hidden),
                offset: { x:  margin, y: availableHeight-maxY*scale  },
            },
        ];
    
        // 绘制每个视图
        for (const view of views) {
            // 实线：可见线
            this.drawSegments(
                ctx,
                view.segmentsVisible,
                false,
                scale,
               view.offset,
            );
    
            // 虚线：隐藏线
            this.drawSegments(
                ctx,
                view.segmentsHidden,
                true,
                scale,
               view.offset,
            );
        }
    }  
    private calculateBounds(segments: Segment[]) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
    
        for (const segment of segments) {
            if (segment && segment.first && segment.second) {
                const points = [segment.first, segment.second];
                for (const p of points) {
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                }
            }
        }
    
        return {
            minX: minX === Infinity ? 0 : minX,
            maxX: maxX === -Infinity ? 0 : maxX,
            minY: minY === Infinity ? 0 : minY,
            maxY: maxY === -Infinity ? 0 : maxY,
        };
    }
    private drawSegments(
        ctx: CanvasRenderingContext2D,
        segments: Segment[],
        isHidden: boolean,
        scale: number,
        offset: { x: number, y: number },
     
    ) {
        ctx.strokeStyle = isHidden ? "gray" : "black";
        ctx.lineWidth = isHidden ? 1 : 2;
        ctx.setLineDash(isHidden ? [5, 5] : []);
    
        for (const segment of segments) {
            if (segment && segment.first && segment.second) {
                ctx.beginPath();
                ctx.moveTo(
                    segment.first.x * scale + offset.x,
                    segment.first.y * scale + offset.y
                );
                Logger.info(segment.first.x * scale , segment.first.y * scale )
                ctx.lineTo(
                    segment.second.x * scale + offset.x ,
                    segment.second.y * scale   + offset.y 
                );
                ctx.stroke();
            }
        }
    }
    private toArray(segmentList: LineSegmentList): Segment[] {
        const result = [];
        for (let i = 0; i < segmentList.size(); i++) {
            const segment = segmentList.get(i);
        if (segment) {
            result.push(segment);
        }
        }
        return result;
    }
    private createCanvas(): HTMLCanvasElement {
        if (!this.viewportCanvas2d) {
            this.viewportCanvas2d = document.createElement("canvas");
            this.viewportCanvas2d.width = 1200;
            this.viewportCanvas2d.height = 600;
            this.viewportCanvas2d.style.border = "1px solid #000";

            const ctx = this.viewportCanvas2d.getContext("2d");
            if (ctx) {
                const document = this.app!.activeView?.document;
                if (!document) return this.viewportCanvas2d;

                const geometries = document.selection.getSelectedNodes();
                const entities = geometries.filter((x) => x instanceof ShapeNode);
                for (const entity of entities) {
                    const shapeResult = entity.shape;
                    if (shapeResult.isOk) {
                        const shape = shapeResult.value; // 获取IShape  

                        // 检查是否为OccShape实例  
                        if (shape instanceof OccShape) {
                            const topoShape = shape.shape; // 访问TopoDS_Shape  
                            const ProjectionEdges=getProjectionEdges(topoShape);
                            this.drawProjectionEdges(ctx,ProjectionEdges)
                        }

                    }
                }
            }
        }
        return this.viewportCanvas2d!;
    }





}

customElements.define("njsgcs-drawing-view", njsgcs_drawingView);
