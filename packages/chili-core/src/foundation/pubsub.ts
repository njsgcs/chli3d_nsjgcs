// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.
import { CommandKeys, ICommand } from "../command";
import { IDocument } from "../document";
import { I18nKeys } from "../i18n";
import { Material } from "../material";
import { INode } from "../model";
import { CursorType, IView } from "../visual";
import { AsyncController } from "./asyncController";
import { IDisposable } from "./disposable";
import { MessageType } from "./messageType";
import { IPropertyChanged } from "./observer";
import { Result } from "./result";
export interface PubSubEventMap {
    activeViewChanged: (view: IView | undefined) => void;
    gethistory: (history: string) => void;
    downhistory: () => void;
    clearFloatTip: () => void;
    clearInput: () => void;
    clearSelectionControl: () => void;
    clearStatusBarTip: () => void;
    closeCommandContext: () => void;
    displayError: (message: string) => void;
    displayHome: (show: boolean) => void;
    documentClosed: (document: IDocument) => void;
    editMaterial: (document: IDocument, material: Material, callback: (material: Material) => void) => void;
    executeCommand: (commandName: CommandKeys) => void;
    modelUpdate: (model: INode) => void;
    njsgcs_showDialog: () => void;
    njsgcs_exportdxf: () => void;
    njsgcs_makebox: (
        ox: number,
        oy: number,
        oz: number,
        length: number,
        width: number,
        height: number,
    ) => void;
    njsgcs_makecylinder: (
        normalx: number,
        normaly: number,
        normalz: number,
        ox: number,
        oy: number,
        oz: number,
        radius: number,
        rz: number,
    ) => void;
    njsgcs_makeline: (
        startx: number,
        starty: number,
        startz: number,
        endx: number,
        endy: number,
        endz: number,
        materialId:number,
    ) => void;
    njsgcs_makearc: (
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
    ) => void;
    njsgcs_makecircle : (
        normalx: number,
        normaly: number,
        normalz: number,
        ox: number,
        oy: number,
        oz: number,
        radius: number,
    ) => void;
    expenddrawview: () => void;
    njsgcs_changecamera: () => void;
    njsgcs_3drebuild: (document: Document) => void;
    njsgcs_drawview: (document: IDocument) => void;
    njsgcs_get_property: (callback: (backresult: string) => void) => void;
    openCommandContext: (command: ICommand) => void;
    parentVisibleChanged: (model: INode) => void;
    selectionChanged: (document: IDocument, selected: INode[], unselected: INode[]) => void;
    showDialog: (title: I18nKeys, context: IPropertyChanged, callback: () => void) => void;
    showFloatTip: (level: MessageType, msg: string) => void;
    showInput: (text: string, handler: (text: string) => Result<string, I18nKeys>) => void;
    showPermanent: (action: () => Promise<void>, message: I18nKeys, ...args: any[]) => void;
    showProperties(document: IDocument, nodes: INode[]): void;
    showSelectionControl: (controller: AsyncController) => void;
    showToast: (message: I18nKeys, ...args: any[]) => void;
    statusBarTip: (tip: I18nKeys) => void;
    viewClosed: (view: IView) => void;
    viewCursor: (cursor: CursorType) => void;
    visibleChanged: (model: INode) => void;
}

type EventCallback = (...args: any[]) => void;
type EventMap = Map<keyof PubSubEventMap, Set<EventCallback>>;

export class PubSub implements IDisposable {
    static readonly default = new PubSub();
    private readonly events: EventMap = new Map();

    dispose(): void {
        this.events.forEach((callbacks) => callbacks.clear());
        this.events.clear();
    }

    sub<K extends keyof PubSubEventMap>(event: K, callback: PubSubEventMap[K]): void {
        const callbacks = this.events.get(event) ?? new Set<EventCallback>();
        callbacks.add(callback);
        this.events.set(event, callbacks);
    }

    pub<K extends keyof PubSubEventMap>(event: K, ...args: Parameters<PubSubEventMap[K]>): void {
        this.events.get(event)?.forEach((callback) => callback(...args));
    }

    remove<K extends keyof PubSubEventMap>(event: K, callback: PubSubEventMap[K]): void {
        this.events.get(event)?.delete(callback);
    }

    removeAll<K extends keyof PubSubEventMap>(event: K): void {
        this.events.get(event)?.clear();
    }
}
