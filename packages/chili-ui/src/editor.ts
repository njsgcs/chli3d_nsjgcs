// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.

import { Button, CommandKeys, I18nKeys, IApplication, PubSub, RibbonTab } from "chili-core";
import { div, Expander } from "./components";
import style from "./editor.module.css";
import { njsgcs_drawingView } from "./njsgcs/njsgcs_drawing_view";
import { njsgcs_graphview } from "./njsgcs/njsgcs_graphView";
import { njsgcs_MakeView } from "./njsgcs/njsgcs_makeView";
import { njsgcs_ProjectView } from "./njsgcs/njsgcs_projectView";
import { ProjectView } from "./project";
import { PropertyView } from "./property";
import { Ribbon, RibbonDataContent } from "./ribbon";
import { RibbonTabData } from "./ribbon/ribbonData";
import { Statusbar } from "./statusbar";
import { LayoutViewport } from "./viewport";
let quickCommands: CommandKeys[] = ["doc.save", "doc.saveToFile", "edit.undo", "edit.redo"];

export class Editor extends HTMLElement {
    readonly ribbonContent: RibbonDataContent;

    constructor(app: IApplication, tabs: RibbonTab[]) {
        super();
        const viewport = new LayoutViewport(app);
        viewport.classList.add(style.viewport);

        this.ribbonContent = new RibbonDataContent(app, quickCommands, tabs.map(RibbonTabData.fromProfile));

        this.render(viewport);
        document.body.appendChild(this);
    }

    private render(viewport: LayoutViewport) {
      
        const expander2 = new Expander("viewport1");
        const expander3 = new Expander("viewport2");
        const expander4 = new Expander("viewport3");
        const drawingView = new njsgcs_drawingView();
        const graphView = new njsgcs_graphview();
        const sidebarexpander = new Expander("sidebar");
        PubSub.default.sub("expenddrawview", () => {
expander3.ExpanderClick(true);
expander2.ExpanderClick(false);

        });
        expander3.append(div({ className: style.viewport }, drawingView));
        expander2.append(div({ className: style.viewport }, viewport));
        expander4.append(div({ className: style.viewport }, graphView));
        

        sidebarexpander.append(
            div(
                { className: style.sidebar },
                new ProjectView({ className: style.sidebarItem }),

                new PropertyView({ className: style.sidebarItem }),

                new njsgcs_ProjectView({
                    className: style.sidebarItem,
                }),
                new njsgcs_MakeView({
                    className: style.sidebarItem,
                }),
            ),
        );
        const horizontalContainer = div({ className: style.horizontalLayout }, 
            div({ className: style.viewport }, expander2, expander3, expander4),
             sidebarexpander);
        this.append(
            new Ribbon(this.ribbonContent),

            horizontalContainer,

            new Statusbar(style.statusbar),
        );
    }

    registerRibbonCommand(tabName: I18nKeys, groupName: I18nKeys, command: CommandKeys | Button) {
        const tab = this.ribbonContent.ribbonTabs.find((p) => p.tabName === tabName);
        const group = tab?.groups.find((p) => p.groupName === groupName);
        group?.items.push(command);
    }
}

customElements.define("chili-editor", Editor);
