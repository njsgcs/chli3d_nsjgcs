// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.
import { IDocument, IView, Logger, PubSub } from "chili-core";

import { button, div, Expander, textarea } from "../components";
import style from "../property/propertyView.module.css";
import { rebuild3D } from "./njsgcs_3drebuild";
import { rebuild3D2 } from "./njsgcs_3drebuild2";
import { face_rebuild } from "./njsgcs_facerebuild";
import { readdxf } from "./njsgcs_readdxf";
import { send_to_llm } from "./njsgcs_send_to_llm";
export class njsgcs_ProjectView extends HTMLElement {
    private _activeDocument: IDocument | undefined;
    private _activeView: IView | undefined;
    get activeDocument() {
        return this._activeDocument;
    }

    private readonly panel: HTMLDivElement;
    private resultLabel: HTMLLabelElement;
    private user_say_input: HTMLTextAreaElement;

    constructor(props: { className: string }) {
        super();
        this.classList.add(style.root, props.className);
        this.panel = div({
            className: style.itemsPanel,
        });
        this.resultLabel = document.createElement("label");
        this.resultLabel.className = style.resultLabel;
        this.resultLabel.style.whiteSpace = "pre-line";
        PubSub.default.sub("activeViewChanged", this.handleActiveViewChanged);

        this.user_say_input = textarea({
            id: "njsgcs_test_input",
            onkeydown: (e: KeyboardEvent) => {
                e.stopPropagation();
            },
        });
        //生成由一个立方体和一个圆柱组成的模型
        //请在200,500,600的位置生成一个10*10*10的正方体
        //生成不常见参数尺寸的一个立方体和一个圆柱体重叠的模型
        //在起点100,200,0 终点300,200,0的位置创建一条直线
        //帮我分析一下这个物体回复长宽高就行\n
        this.user_say_input.value = "在起点100,200,0 终点300,200,0的位置创建一条直线\n";
        this.render();
    }
    private readonly handleActiveViewChanged = (view: IView | undefined) => {
        if (this._activeDocument === view?.document) return;
        this._activeView = view;
        this._activeDocument = view?.document;
    };
    private makebox(ox: number, oy: number, oz: number, length: number, width: number, height: number) {
        PubSub.default.pub("njsgcs_makebox", ox, oy, oz, length, width, height);
    }

    private makecylender(
        normalx: number,
        normaly: number,
        normalz: number,
        ox: number,
        oy: number,
        oz: number,
        radius: number,
        dz: number,
    ) {
        PubSub.default.pub("njsgcs_makecylinder", normalx, normaly, normalz, ox, oy, oz, radius, dz);
    }
    private makeline(
        startx: number,
        starty: number,
        startz: number,
        endx: number,
        endy: number,
        endz: number,
    ) {
        PubSub.default.pub("njsgcs_makeline", startx, starty, startz, endx, endy, endz,0);
    }
    private render() {
        const expander = new Expander("njsgcs_sidebar"); // 创建 Expander
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.style.display = "none"; // 隐藏输入框

        // 处理文件选择事件
        fileInput.addEventListener("change", async (event) => {
            const target = event.target as HTMLInputElement;
            this.resultLabel.textContent = "正在上传并检测图像...";
            if (target.files && target.files.length > 0) {
                const file = target.files[0];
                Logger.info(`Selected file: ${file.name}`);

                try {
                    const reader = new FileReader();
                    reader.onload = async () => {
                        try {
                            const base64Data = reader.result?.toString().split(",")[1];
                            const response = await fetch("http://localhost:8737/detect", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ image_data: base64Data }),
                            });

                            if (!response.ok) throw new Error("Network response was not ok");

                            const data = await response.json();

                            const formattedResult = data
                                .map((item: any, index: number) => {
                                    const objType = item.Object;
                                    const confidence = (item.Confidence * 100).toFixed(2);
                                    const [x1, y1, x2, y2] = item.BoxCoordinate[0];
                                    return `目标 ${index + 1}: ${objType}, 置信度 ${confidence}%, 左下角坐标 ${x1.toFixed(1)}, ${y1.toFixed(1)},长宽, ${(x2 - x1).toFixed(1)}, ${(y2 - y1).toFixed(1)}`;
                                })
                                .join("\n");

                            this.resultLabel.textContent = `检测到 ${data.length} 个物体:\n${formattedResult}`;
                            this.user_say_input.value += `${formattedResult}\n`;
                        } catch (error) {
                            Logger.error("请求失败:", error);
                        }
                    };
                    reader.readAsDataURL(file);
                } catch (err) {
                    Logger.error(`处理文件时出错: ${err}`);
                }
            }
        });

        // 把原来添加到 this.panel 的内容先添加到 expander 中
        expander.append(
            div({ className: style.textarea }, this.user_say_input),
            //llm_button
            div(
                { className: style.buttons },
                button({
                    textContent: "发送",
                    onclick: async () => {
                        try {
                            this.resultLabel.textContent = "正在处理对话...";

                            // 动态获取输入框的值
                            const body = JSON.stringify({
                                messages: [
                                    { content: this.user_say_input.value, role: "user" },
                                    { content: "you are a helpful assistant", role: "system" },
                                ],
                                model: "deepseek-chat",
                            });
                            const result = await send_to_llm(body);
                            this.resultLabel.textContent = result;
                            Logger.info("llm返回：" + result);
                        } catch (error) {
                            Logger.error("Failed to parse response as JSON:", error);
                        }
                    },
                }),
                button({
                    textContent: "带属性发送",
                    onclick: async () => {
                        try {
                            Logger.info("按钮接收到点击事件");
                            // 动态获取输入框的值

                            PubSub.default.pub("njsgcs_get_property", async (callbackresult2: string) => {
                                const body = JSON.stringify({
                                    messages: [
                                        {
                                            content: this.user_say_input.value + callbackresult2,
                                            role: "user",
                                        },
                                        { content: "you are a helpful assistant", role: "system" },
                                    ],
                                    model: "deepseek-chat",
                                });
                                const result = await send_to_llm(body);
                                this.resultLabel.textContent = result;
                                Logger.info("llm返回：" + result);
                            });
                        } catch (error) {
                            Logger.error("Failed to parse response as JSON:", error);
                        }
                    },
                }),
            ),
            //get属性后发送

            div(
                { className: style.buttons },
                button({
                    textContent: "ai生成模型",
                    onclick: async () => {
                        try {
                            PubSub;
                            this.resultLabel.textContent = "正在处理对话...";
                            // 动态获取输入框的值
                            let prompt = `请返回纯代码文本，不要返回其他内容
                            不要返回注释和点点点：python
# 创建一个立方体和一个圆柱组成的模型
                            如果在点500,300,560的位置创建一个30*50*60的立方体：

                              this.makebox( 500,300 ,560 ,30, 50, 60)
                              如果在点500,300,560的位置创建一个半径30高度50法向为x轴的圆柱体：
                              this.makecylender(1,0,0, 500,300,560,30, 50)
                              如果要在起点100,200,0 终点300,200,0的位置创建一条直线：
                              this.makeline(100,200,0, 300,200,0)
                             `;

                            // this.makebox(10,10,10)
                            const body = JSON.stringify({
                                messages: [
                                    { content: this.user_say_input.value, role: "user" },
                                    { content: prompt, role: "system" },
                                ],
                                model: "deepseek-chat",
                            });
                            const result = await send_to_llm(body);
                            const code = result.replace(/```javascript/g, "").replace(/```/g, "");
                            PubSub.default.pub("gethistory", code);

                            eval(code);
                            this.resultLabel.textContent = "";
                        } catch (error) {
                            Logger.error("Failed to parse response as JSON:", error);
                        }
                    },
                }),
                button({
                    textContent: "截图",
                    onclick: async () => {
                        try {
                            this._activeView?.downloadImage();
                        } catch (error) {
                            Logger.error("Failed to parse response as JSON:", error);
                        }
                    },
                }),
            ),
            div(
                { className: style.buttons },
                button({
                    textContent: "yolo读图",
                    onclick: async () => {
                        try {
                            fileInput.click();
                        } catch (error) {
                            Logger.error("Failed to parse response as JSON:", error);
                        }
                    },
                }),
            ), div(
                { className: style.buttons },
                button({
                    textContent: "生成工程图",
                    onclick: async () => {
                        try {
                             PubSub.default.pub("njsgcs_drawview", this._activeDocument! );
                     
                            } catch (error) {
                            Logger.error("Failed to parse response as JSON:", error);
                        }
                    },
                }),
            ),
                 div(
                { className: style.buttons },
                button({
                    textContent: "导出工程图dxf",
                    onclick: async () => {
                        try {
                             PubSub.default.pub("njsgcs_drawview", this._activeDocument! );
                            PubSub.default.pub("njsgcs_exportdxf");
                          
                        } catch (error) {
                            Logger.error("Failed to parse response as JSON:", error);
                        }
                    },
                }),
            ),
                div(
                { className: style.buttons },
                button({
                    textContent: "读取DXF文件",
                    onclick: async () => {
                        try {
                 readdxf( document);
                      
                          
                        } catch (error) {
                            Logger.error("Failed to parse response as JSON:", error);
                        }
                    },
                }),
            ),
                 div(
                { className: style.buttons },
                button({
                    textContent: "dxf三维重建1",
                    onclick: async () => {
                        try {
                            Logger.info("dxf三维重建按钮接收到点击事件");
                            rebuild3D(document);
                          
                        } catch (error) {
                            Logger.error("Failed to parse response as JSON:", error);
                        }
                    },
                }),
            ),
              div(
                { className: style.buttons },
                button({
                    textContent: "dxf三维重建2",
                    onclick: async () => {
                        try {
                            Logger.info("dxf三维重建按钮接收到点击事件");
                            rebuild3D2(document);
                          
                        } catch (error) {
                            Logger.error("Failed to parse response as JSON:", error);
                        }
                    },
                }),
            ),
            div(
                { className: style.buttons },
                button({
                    textContent: "生成壳体",
                    onclick: async () => {
                        try {
                           face_rebuild (this._activeDocument!);
                          
                        } catch (error) {
                            Logger.error("Failed to parse response as JSON:", error);
                        }
                    },
                }),
            ),
            div({ className: style.result }, this.resultLabel),
        );
        this.panel.append(expander);
        // 确保 this.panel 被添加到当前的 HTMLElement 中
        this.appendChild(this.panel);
    }
}

customElements.define("chili-project-njsgcs-view", njsgcs_ProjectView);
