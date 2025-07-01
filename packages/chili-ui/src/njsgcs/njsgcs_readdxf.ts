import { Logger, PubSub } from "chili-core";
import DxfParser, { IArcEntity, ICircleEntity, ILineEntity, ISplineEntity } from 'dxf-parser';

export function readdxf(document: Document) {

          
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".dxf"; // 修改为正确的文件类型
  fileInput.style.display = "none"; // 隐藏输入框
  

    fileInput.click(); // 触发文件选择
  


  // 处理文件选择事件
  fileInput.addEventListener("change", async (event) => {
    const target = event.target as HTMLInputElement;

    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      Logger.info(`Selected file: ${file.name}`);

      try {
        const reader = new FileReader();
        reader.onload = function () {
          const dxfText = reader.result as string;
         
          const parser = new DxfParser();
          try {
            const dxf = parser.parseSync(dxfText);
            

if (dxf && dxf.entities) {
  dxf.entities.forEach(entity => {
    if (entity.type === 'LINE') {
      const lineEntity = entity as ILineEntity;
      const start =lineEntity.vertices[0];
      const end = lineEntity.vertices[1];

      // 确保起点和终点都有坐标
      if (start && end) {
        PubSub.default.pub("njsgcs_makeline",
          start.x, start.y, start.z,
          end.x, end.y, end.z,1
        );
      }
    }else if (entity.type === 'CIRCLE') {
      const circleEntity = entity as ICircleEntity;
      const center = circleEntity.center;
      const radius = circleEntity.radius;
     let normal=[0,0,1];
     if (center.x==0) normal=[1,0,0];
     else if (center.y==0) normal=[0,1,0];

     
      // 确保圆心和半径都有值
      if (center && radius) {
        PubSub.default.pub("njsgcs_makecircle",
             normal[0], normal[1], normal[2],
          center.x, center.y, center.z,
          radius
          );
      }}else if(entity.type === 'ARC'){
const arcEntity = entity as IArcEntity;
const center = arcEntity.center;
const radius = arcEntity.radius;


   const startX = center.x + radius * Math.cos(arcEntity.startAngle);
    const startY = center.y + radius * Math.sin(arcEntity.startAngle);
    const startPoint = { x: startX, y: startY, z: center.z }; // 假设 Z 不变
    const endX = center.x + radius * Math.cos(arcEntity.endAngle);
    const endY = center.y + radius * Math.sin(arcEntity.endAngle);
    const endPoint = { x: endX, y: endY, z: center.z }; // 假设 Z 不变
const angleDelta = (arcEntity.endAngle-arcEntity.startAngle )*180/Math.PI;
let normal=[0,0,1]; 
if (center.x==0) normal=[1,0,0];
else if (center.y==0) normal=[0,1,0];
Logger.info(`解析 Arc: normal=${JSON.stringify(normal)}, center=${JSON.stringify(center)}, radius=${radius}, startPoint=(${startPoint.x}, ${startPoint.y}, ${startPoint.z}),endPoint=(${endPoint.x}, ${endPoint.y}, ${endPoint.z}), angleDelta=${angleDelta}, startAngle=${arcEntity.startAngle*180/Math.PI}, endAngle=${arcEntity.endAngle*180/Math.PI}`);
PubSub.default.pub("njsgcs_makearc",
  normal[0], normal[1], normal[2],
  center.x, center.y, center.z,
 startPoint.x, startPoint.y, startPoint.z
 , angleDelta+360);

}else if(entity.type === 'SPLINE'){

    const splineEntity = entity as ISplineEntity ;
   if (splineEntity.controlPoints && splineEntity.controlPoints.length > 0) {
    
    const controlPoints = splineEntity.controlPoints;

    // 将控制点头尾相连画线
  
      const start = controlPoints[0];
      const end = controlPoints[controlPoints.length - 1];

      PubSub.default.pub("njsgcs_makeline", 
        start.x, start.y, start.z || 0,
        end.x, end.y, end.z || 0,
        1 // 线宽或其他参数
      );
    
  } else {
    Logger.warn('SPLINE 实体缺少控制点');
  }
}
  });
}

            Logger.info('成功解析 DXF:', dxf);
          } catch (err) {
            Logger.error('解析失败:', err);
          }
        };

        reader.readAsText(file);
      } catch (error) {
        Logger.error("读取文件失败:", error);
      }
    }
  });
}