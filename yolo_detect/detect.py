from ultralytics import YOLO
import numpy as np
# 加载模型
model = YOLO('./best.pt')

# 执行预测并获取结果
results = model.predict(source='./valid/images/screenshot-20250504103355_png.rf.71febf531b60b1e416aece6136e28388.jpg')

# 遍历结果
for result in results:
    boxes = result.boxes  # 获取所有检测到的边框
    for box in boxes:
        print("BoundingBox: ", box.xyxy)  # 输出边框坐标(x1, y1, x2, y2)
      
        print("Confidence: ", box.conf)   # 置信度分数
        print("Class: ", box.cls)         # 类别ID
        print("物体是: ",model.names[int(box.cls.item()) ],"范围为: ",box.xyxy.cpu().numpy()) 