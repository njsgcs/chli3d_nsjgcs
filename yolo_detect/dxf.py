import ezdxf
import tempfile
import os


def draw_lines_and_get_dxf(lines):
    """
    根据给定的线段列表绘制直线，并返回 DXF 文档的字符串格式。

    :param lines: 线段列表，每个线段由起点和终点组成，格式为 [{"start": {"x": x1, "y": y1, "z": z1}, "end": {"x": x2, "y": y2, "z": z2}}, ...]
    :return: DXF 文档的字符串表示
    """
    # 创建一个新的 DXF 文档
    doc = ezdxf.new('R2010')
    msp = doc.modelspace()

    # 遍历每条线段并绘制直线
    for line in lines:
        print(line)
        start = (line["start"]["x"], line["start"]["y"], line["start"]["z"])
        end = (line["end"]["x"], line["end"]["y"], line["end"]["z"])
        msp.add_line(start, end)
   
    # 保存到临时文件
    with tempfile.NamedTemporaryFile(suffix=".dxf", delete=False) as temp_file:
        doc.saveas(temp_file.name)
     
        temp_file_path = temp_file.name
    # 创建保存目录
    # save_dir = './run/dxf'
    # os.makedirs(save_dir, exist_ok=True)

    # # 另存为指定路径
    # save_path = os.path.join(save_dir, 'output.dxf')
    # doc.saveas(save_path)
    # 读取文件内容
    with open(temp_file_path, "r") as file:
        dxf_content = file.read()

    # 删除临时文件
    os.remove(temp_file_path)

    return dxf_content