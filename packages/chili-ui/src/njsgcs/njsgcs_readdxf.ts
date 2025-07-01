import { Logger, PubSub } from "chili-core";
import DxfParser, { ILineEntity } from 'dxf-parser';

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