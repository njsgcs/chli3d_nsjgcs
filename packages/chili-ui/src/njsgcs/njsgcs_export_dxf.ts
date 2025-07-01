import { DxfWriter, point3d } from '@tarikjabiri/dxf';

export function export_dxf(linelist:[number, number, number, number,boolean][]) {
   // 如果是浏览器环境
 
   const dxf = new DxfWriter();
 
  
 
    // 添加一个图层（可选）
    dxf.addLayer('Lines', 7); // 颜色索引 7 是黑色
 
  
    // 遍历 linelist 添加线段
    for (const [p1x, p1y,p2x,p2y,isHidden] of linelist) {
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