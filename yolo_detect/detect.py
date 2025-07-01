from ultralytics import YOLO

import base64
from io import BytesIO
from PIL import Image
import json

# 加载模型
model = YOLO('./yolo_detect/best.pt')


def predict(img_data):
    image_data = base64.b64decode(img_data)
    image = Image.open(BytesIO(image_data))
    results = model.predict(source=image)

    predictions = []
    for result in results:
        boxes = result.boxes
        for box in boxes:
            predictions.append({
                "Confidence": box.conf.item(),
                "Object": model.names[int(box.cls.item())],
                "BoxCoordinate": box.xyxy.cpu().numpy().tolist()
            })
    return predictions

