import { IDocument, IView, PubSub } from "chili-core";
export class njsgcs_Change_Camera {
    private constructor() {
        PubSub.default.sub("activeViewChanged", this.handleActiveViewChanged);
    }
    private _activeDocument: IDocument | undefined;
    private _activeview: IView | undefined;
    private readonly handleActiveViewChanged = (view: IView | undefined) => {
        if (this._activeDocument === view?.document) return;
        this._activeview = view;
        this._activeDocument = view?.document;
    };

    private change() {
        this._activeview!.change(1);
    }
}
