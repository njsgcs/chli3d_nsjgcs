// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.

import { IDocument, IView, Logger, PubSub } from "chili-core";
import { button, div, Expander, input, label } from "../components";
import style from "../property/propertyView.module.css";

export class njsgcs_MakeView extends HTMLElement {
    private _activeDocument: IDocument | undefined;
    get activeDocument() {
        return this._activeDocument;
    }

    private readonly panel: HTMLDivElement;
    private resultLabel: HTMLLabelElement;

    constructor(props: { className: string }) {
        super();
        this.classList.add(style.root, props.className);
        this.panel = div({
            className: style.itemsPanel,
        });
        this.resultLabel = document.createElement("label");
        this.resultLabel.className = style.resultLabel;

        this.render();
    }
    private readonly handleActiveViewChanged = (view: IView | undefined) => {
        if (this._activeDocument === view?.document) return;

        this._activeDocument = view?.document;
    };
    private makebox(ox: number, oy: number, oz: number, length: number, width: number, height: number) {
        PubSub.default.pub("njsgcs_makebox", ox, oy, oz, length, width, height);
    }
    private render() {
        const expander = new Expander("njsgcs_makeview"); // 创建 Expander

        // 把原来添加到 this.panel 的内容先添加到 expander 中
        expander.append(
            div(
                { className: style.inputGroup }, // 新增输入组容器
                // 输入框和标签：X 坐标
                div(
                    { className: style.inputItem },
                    label({ textContent: "X 坐标:" }),
                    input({
                        type: "number",
                        id: "ox",
                        defaultValue: "0",
                        className: style.inputField,
                        onkeydown: (e: KeyboardEvent) => {
                            e.stopPropagation();
                        },
                    }),
                ),
                // 输入框和标签：Y 坐标
                div(
                    { className: style.inputItem },
                    label({ textContent: "Y 坐标:" }),
                    input({
                        type: "number",
                        id: "oy",
                        defaultValue: "0",
                        className: style.inputField,
                        onkeydown: (e: KeyboardEvent) => {
                            e.stopPropagation();
                        },
                    }),
                ),
                // 输入框和标签：Z 坐标
                div(
                    { className: style.inputItem },
                    label({ textContent: "Z 坐标:" }),
                    input({
                        type: "number",
                        id: "oz",
                        defaultValue: "0",
                        className: style.inputField,
                        onkeydown: (e: KeyboardEvent) => {
                            e.stopPropagation();
                        },
                    }),
                ),
                // 输入框和标签：长度
                div(
                    { className: style.inputItem },
                    label({ textContent: "长度:" }),
                    input({
                        type: "number",
                        id: "length",
                        defaultValue: "500",
                        className: style.inputField,
                        onkeydown: (e: KeyboardEvent) => {
                            e.stopPropagation();
                        },
                    }),
                ),
                // 输入框和标签：宽度
                div(
                    { className: style.inputItem },
                    label({ textContent: "宽度:" }),
                    input({
                        type: "number",
                        id: "width",
                        defaultValue: "600",
                        className: style.inputField,
                        onkeydown: (e: KeyboardEvent) => {
                            e.stopPropagation();
                        },
                    }),
                ),
                // 输入框和标签：高度
                div(
                    { className: style.inputItem },
                    label({ textContent: "高度:" }),
                    input({
                        type: "number",
                        id: "height",
                        defaultValue: "700",
                        className: style.inputField,
                        onkeydown: (e: KeyboardEvent) => {
                            e.stopPropagation();
                        },
                    }),
                ),
            ),
            div(
                { className: style.buttons },
                button({
                    textContent: "参数建模生成立方体",
                    onclick: async () => {
                        try {
                            // 获取输入值
                            const ox = parseFloat((document.getElementById("ox") as HTMLInputElement).value);
                            const oy = parseFloat((document.getElementById("oy") as HTMLInputElement).value);
                            const oz = parseFloat((document.getElementById("oz") as HTMLInputElement).value);
                            const length = parseFloat(
                                (document.getElementById("length") as HTMLInputElement).value,
                            );
                            const width = parseFloat(
                                (document.getElementById("width") as HTMLInputElement).value,
                            );
                            const height = parseFloat(
                                (document.getElementById("height") as HTMLInputElement).value,
                            );

                            // 验证输入值
                            if (
                                isNaN(ox) ||
                                isNaN(oy) ||
                                isNaN(oz) ||
                                isNaN(length) ||
                                isNaN(width) ||
                                isNaN(height)
                            ) {
                                Logger.error("请输入有效的数字");
                                return;
                            }

                            // 调用 makebox 方法
                            this.makebox(ox, oy, oz, length, width, height);
                            PubSub.default.pub(
                                "gethistory",
                                `this.makebox(${ox}, ${oy}, ${oz}, ${length}, ${width}, ${height})`,
                            );
                        } catch (error) {
                            Logger.error("生成立方体时出错:", error);
                        }
                    },
                }),
            ),
            div(
                { className: style.buttons },
                button({
                    textContent: "生成数据库",
                    onclick: async () => {
                        try {
                            PubSub.default.pub("downhistory");
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

customElements.define("chili-project-njsgcs-makeview", njsgcs_MakeView);
