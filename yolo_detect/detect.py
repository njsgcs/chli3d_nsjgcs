from ultralytics import YOLO
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from io import BytesIO
from PIL import Image
import json

# 加载模型
model = YOLO('./yolo_detect/best.pt')

app = Flask(__name__)
CORS(app)  # 启用跨域支持

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

@app.route('/', methods=['POST'])
def handle_post():
    payload = request.get_json()
    img_data = payload.get("image_data")

    if not img_data:
        return jsonify({"error": "Missing image data"}), 400

    try:
        result = predict(img_data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8737)