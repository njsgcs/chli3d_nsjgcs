
from flask import Flask, request, jsonify
from flask_cors import CORS
from detect import predict
from dxf import draw_lines_and_get_dxf
app = Flask(__name__) 
CORS(app)  # 启用跨域支持
@app.route('/detect', methods=['POST'])
def detect_post():
    payload = request.get_json()
    img_data = payload.get("image_data")

    if not img_data:
        return jsonify({"error": "Missing image data"}), 400

    try:
        result = predict(img_data)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/dxf', methods=['POST'])
def dxf_post():
    payload = request.get_json()
    lines = payload.get("lines")  # 修改为接收 lines 参数

    if not lines:
        return jsonify({"error": "Missing lines data"}), 400

    try:
        result = draw_lines_and_get_dxf(lines)
        return jsonify({"result": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8737)