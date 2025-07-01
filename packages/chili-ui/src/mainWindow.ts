// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.

import { ArcNode, BoxNode, CylinderNode, LineNode } from "chili";
import {
    Button,
    CommandKeys,
    debounce,
    I18nKeys,
    IApplication,
    IWindow,
    Logger,
    Material,
    Plane,
    PubSub,
    RibbonTab,
    XYZ
} from "chili-core";
import { Dialog } from "./dialog";
import { Editor } from "./editor";
import { Home } from "./home";
import { njsgcs_get_property } from "./njsgcs/njsgcs.get_property";
import { njsgcs_Dialog } from "./njsgcs/njsgcs_dialog";
import { Permanent } from "./permanent";
import { Toast } from "./toast";

document.oncontextmenu = (e) => e.preventDefault();
document.body.addEventListener("scroll", (e) => {
    document.body.scrollTop = 0;
});

export class MainWindow implements IWindow {
    private _inited: boolean = false;
    private _home?: Home;
    private _editor?: Editor;
    private history: string = "";
    constructor(readonly tabs: RibbonTab[]) {
        this.setTheme("light");
    }

    init(app: IApplication) {
        if (this._inited) {
            throw new Error("MainWindow is already inited");
        }
        this._inited = true;
        this._initHome(app);
        this._initEditor(app);
        this._initSubs(app);
    }

    private _initSubs(app: IApplication) {
        const displayHome = debounce(this.displayHome, 100);
        const redMaterial = new Material( app.activeView?.document!, "Red", 0xff0000,"1");  
       const greenMaterial = new Material(app.activeView?.document!, "Green", 0x00ff00,"2");  
       const blueMaterial = new Material(app.activeView?.document!, "Blue", 0x0000ff,"3");  
               const yellowMaterial = new Material(app.activeView?.document!, "Yellow", 0xffff00, "4"); // 黄色
       const cyanMaterial = new Material(app.activeView?.document!, "Cyan", 0x00ffff, "5");     // 青色
        app.activeView?.document.materials.push(redMaterial, greenMaterial, blueMaterial,yellowMaterial, cyanMaterial);
       
        PubSub.default.sub("showToast", Toast.info);
        PubSub.default.sub("displayError", Toast.error);
        PubSub.default.sub("showDialog", Dialog.show);
        PubSub.default.sub("njsgcs_showDialog", njsgcs_Dialog.show);
        PubSub.default.sub("njsgcs_changecamera", () => {
            Logger.info("njsgcs_changecamera!!!!");
            const cameraController = app.activeView?.cameraController!;
            // 获取当前相机位置与目标点的距离
            const distance = cameraController.camera.position.distanceTo(cameraController.target);
            // 计算新的相机位置（左视图）
            const newPosition = cameraController.target.clone().add(new XYZ(-distance, 0, 0));
            cameraController.lookAt(newPosition, cameraController.target, new XYZ(0, 0, 1));
            app.activeView?.update();
        });
        PubSub.default.sub("njsgcs_get_property", async (callback) => {
            const property = await njsgcs_get_property.get_property(app); // 等待异步结果
            callback(property!);
        });
        PubSub.default.sub(
            "njsgcs_makebox",
            (ox: number, oy: number, oz: number, length: number, width: number, height: number) => {
                Logger.info("makebox!!!!");

                const boxnode = new BoxNode(
                    app.activeView?.document!,
                    new Plane(new XYZ(ox, oy, oz), XYZ.unitZ, XYZ.unitX),
                    length,
                    width,
                    height,
                );
                app.activeView?.document.addNode(boxnode);
                app.activeView?.update();
                app.activeView?.cameraController.fitContent();
            },
        );
        PubSub.default.sub(
            "njsgcs_makecylinder",
            (
                normalx: number,
                normaly: number,
                normalz: number,
                ox: number,
                oy: number,
                oz: number,
                radius: number,
                dz: number,
            ) => {
                Logger.info("makecylinder!!!!");

                const cylindernode = new CylinderNode(
                    app.activeView?.document!,
                    new XYZ(normalx, normaly, normalz),
                    new XYZ(ox, oy, oz),
                    radius,
                    dz,
                );
                app.activeView?.document.addNode(cylindernode);
                app.activeView?.update();
                app.activeView?.cameraController.fitContent();
            },
        );
          PubSub.default.sub(
            "njsgcs_makearc",
            (
                normalx: number,
                normaly: number,
                normalz: number,
                ox: number,
                oy: number,
                oz: number,
                 sx: number,
               sy: number,
                sz: number,
                angle: number,
            ) => {
                Logger.info("makearc!!!!");

                const arcnode = new ArcNode(
                    app.activeView?.document!,
                    new XYZ(normalx, normaly, normalz),
                    new XYZ(ox, oy, oz),
                    new XYZ(sx, sy, sz),
                    angle,
                );
                app.activeView?.document.addNode(arcnode);
                app.activeView?.update();
                app.activeView?.cameraController.fitContent();
            },
        );
        PubSub.default.sub(
            "njsgcs_makeline",
            (startx: number, starty: number, startz: number, endx: number, endy: number, endz: number,color:number) => {
                

                const linenode = new LineNode(
                    app.activeView?.document!,
                    new XYZ(startx, starty, startz),
                    new XYZ(endx, endy, endz),
                );
//               const materialIds = app.activeView?.document!.materials.map(material => material.id);  
// console.log("所有材质ID:", materialIds);
          
         if(color<6)linenode.materialId =  color.toString();  
           
               
                app.activeView?.document.addNode(linenode);
                app.activeView?.update();
                app.activeView?.cameraController.fitContent();
            },
        );
        PubSub.default.sub("showPermanent", Permanent.show);
        PubSub.default.sub("gethistory", (part_history: string) => {
            this.history += part_history;
        });
        PubSub.default.sub("downhistory", () => {
            Logger.info(this.history);
        });

        PubSub.default.sub("activeViewChanged", (view) => displayHome(app, view === undefined));
        PubSub.default.sub("displayHome", (show) => displayHome(app, show));
    }

    private readonly displayHome = (app: IApplication, displayHome: boolean) => {
        if (this._home) {
            this._home.remove();
            this._home = undefined;
        }
        if (displayHome) {
            this._initHome(app);
        }
    };

    private async _initHome(app: IApplication) {
        this._home = new Home(app);
        await this._home.render();
    }

    private async _initEditor(app: IApplication) {
        this._editor = new Editor(app, this.tabs);
    }

    registerHomeCommand(groupName: I18nKeys, command: CommandKeys | Button): void {
        throw new Error("Method not implemented.");
    }

    registerRibbonCommand(tabName: I18nKeys, groupName: I18nKeys, command: CommandKeys | Button) {
        this._editor?.registerRibbonCommand(tabName, groupName, command);
    }

    setTheme(theme: "light" | "dark") {
        document.documentElement.setAttribute("theme", theme);
    }
}
