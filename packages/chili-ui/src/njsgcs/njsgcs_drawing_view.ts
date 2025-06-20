import { DxfWriter, point3d } from '@tarikjabiri/dxf';
import { IDocument, Logger, PubSub, ShapeNode } from "chili-core";
import { getProjectionEdges, gp_Pnt, LineSegmentList, OccShape, ProjectionResult2 } from "chili-wasm";
import { Matrix3, Vector3 } from "three";

interface Segment {
    first: gp_Pnt;
    second: gp_Pnt;
}



export class njsgcs_drawingView extends HTMLElement {
    private viewportCanvas2d: HTMLCanvasElement | null = null;
    private activeDocument: IDocument | undefined; 
    private linelist: [number, number, number, number,boolean][] = [];

    constructor() {
        super();
        PubSub.default.sub("njsgcs_drawview", async (activeDocument: IDocument) => {
            Logger.info("njsgcs_drawview event triggered");
            if (this.viewportCanvas2d) {
                this.removeChild(this.viewportCanvas2d);
                this.viewportCanvas2d = null;
            }
            this.activeDocument = activeDocument;
           

         
            const canvas = this.createCanvas();
            this.appendChild(canvas);
        });
        PubSub.default.sub("njsgcs_exportdxf", () => {
            Logger.info("njsgcs_export_dxf event triggered");
            this.export_dxf();
        });
       
    }
    private export_dxf() {
   // 如果是浏览器环境
 
   const dxf = new DxfWriter();
 
  
 
    // 添加一个图层（可选）
    dxf.addLayer('Lines', 7); // 颜色索引 7 是黑色
 
  
    // 遍历 linelist 添加线段
    for (const [p1x, p1y,p2x,p2y,isHidden] of this.linelist) {
        const start = point3d(p1x,p1y);
        const end = point3d(p2x, p2y);
const CommonEntityOptions = {
  trueColor: "7",
     colorNumber: 7,
     extrusion: undefined,
     layerName: "Lines",
     visible: isHidden,
     lineType: "BYLAYER",
     lineTypeScale: 1,
 }
        dxf.addLine(start, end,    CommonEntityOptions ); // 修复图层参数类型为CommonEntityOptions
    }
 
 
    // 生成 DXF 字符串内容
    const dxfString = dxf.stringify();
    
    // 创建 Blob 并触发下载
    const blob = new Blob([dxfString], { type: "application/dxf" });
    const url = URL.createObjectURL(blob);
    const now = new Date().toISOString()
    .replace(/[:.]/g, '') // 移除冒号和点
    .replace('T', '_');
    const a = document.createElement("a");
    a.href = url;
    a.download = `${now} output.dxf`;
    a.click();
 
    // 释放资源
    URL.revokeObjectURL(url);
}

    private drawProjectionEdges(ctx: CanvasRenderingContext2D, projection: ProjectionResult2) {
        // 清除画布
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
        
        const margin = 100;
        const availableWidth = ctx.canvas.width ;
        const availableHeight = ctx.canvas.height ;

      
      
        const scale = 0.5; // 留点边距
const swapXYMatrix = new Matrix3().set(
  0, 1, 0,
  -1, 0, 0,
  0, 0, 1
);
const swapXYMatrix2 = new Matrix3().set(
  0, 1, 0,
  -1, 0, 0,
  0, 0, 1
);
const swapXYMatrix3 = new Matrix3().set(
  -1, 0, 0,
  0,-1,  0,
  0, 0, 1
);

    
        // 定义各视图偏移
        const views = [
            {
                name: 'front',
                segmentsVisible: this.toArray(projection.f_visible),
                segmentsHidden: this.toArray(projection.f_hidden),
                
                matrix :  new Matrix3()
  
  .scale(scale, scale)
  .multiply(swapXYMatrix) 
  .translate(margin, margin)
                   
            },
            { 
                name: 'side',
                segmentsVisible: this.toArray(projection.s_visible),
                segmentsHidden: this.toArray(projection.s_hidden),
               matrix :  new Matrix3()
  
  .scale(scale, scale)
  .multiply(swapXYMatrix2) 
  .translate(availableWidth-margin, margin)
                   
         
            },
            {
                name: 'top',
                segmentsVisible: this.toArray(projection.t_visible),
                segmentsHidden: this.toArray(projection.t_hidden),
               matrix :  new Matrix3()
  
  .scale(scale, scale)
  .multiply(swapXYMatrix3) 
                   .translate(margin,availableHeight-margin)
         
            
            },
        ];
    
        // 绘制每个视图
        for (const view of views) {
            // 实线：可见线
            this.drawSegments(
                ctx,
                view.segmentsVisible,
                false,
             
               view.matrix,
            );
    
            // 虚线：隐藏线
            this.drawSegments(
                ctx,
                view.segmentsHidden,
                true,
               
               view.matrix,
            );
        }
    }  

    private drawSegments(
        ctx: CanvasRenderingContext2D,
        segments: Segment[],
        isHidden: boolean,
       
        matrix: Matrix3,
     
    ) {
        ctx.strokeStyle = isHidden ? "gray" : "black";
        ctx.lineWidth = isHidden ? 1 : 2;
        ctx.setLineDash(isHidden ? [5, 5] : []);
          ctx.setTransform(1, 0, 0, -1, 0, ctx.canvas.height);
    Logger.info(matrix)
        for (const segment of segments) {
            if (segment && segment.first && segment.second) {
                ctx.beginPath();
                const transformedPoint = new Vector3(segment.first.x, segment.first.y, 1).applyMatrix3(matrix);


                ctx.moveTo(
                     transformedPoint.x,
                     transformedPoint.y
                );
                
                Logger.info(transformedPoint.x , transformedPoint.y )
                const transformedPoint2 = new Vector3(segment.second.x, segment.second.y, 1).applyMatrix3(matrix);
                ctx.lineTo(
                       transformedPoint2.x,
                     transformedPoint2.y
                );
                ctx.stroke();

                this.linelist.push([
    parseFloat(transformedPoint.x.toFixed(1)),
    parseFloat(transformedPoint.y.toFixed(1)),
    parseFloat(transformedPoint2.x.toFixed(1)),
    parseFloat(transformedPoint2.y.toFixed(1)),
    isHidden
]);
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
                const document = this.activeDocument;
                if (!document) return this.viewportCanvas2d;

                const geometries = document.selection.getSelectedNodes();
                const entities = geometries.filter((x) => x instanceof ShapeNode);
             Logger.info(`Number of entities: ${entities.length}`);
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
