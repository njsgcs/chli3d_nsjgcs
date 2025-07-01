// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.
import { LineNode } from "chili";
import {
    EditableShapeNode,
    I18n,
    IDataExchange,
    IDocument,
    IShape,
    PubSub,
    Result,
    ShapeNode,
    VisualNode,
} from "chili-core";

//import { DxfDocument, Line,DxfWriter, point3d } from '@tarikjabiri/dxf';
async function importBrep(document: IDocument, file: File) {
    const shape = document.application.shapeFactory.converter.convertFromBrep(await file.text());
    if (!shape.isOk) {
        return Result.err(shape.error);
    }
    return Result.ok(new EditableShapeNode(document, file.name, shape.value));
}

async function exportBrep(document: IDocument, shapes: IShape[]) {
    const comp = document.application.shapeFactory.combine(shapes);
    if (!comp.isOk) {
        return Result.err(comp.error);
    }
    return document.application.shapeFactory.converter.convertToBrep(comp.value);
}

export class DefaultDataExchange implements IDataExchange {
    importFormats(): string[] {
        return [".step", ".stp", ".iges", ".igs", ".brep"];
    }

    exportFormats(): string[] {
        return [".step", ".iges", ".brep", ".dxf"];
    }

    async import(document: IDocument, files: FileList | File[]): Promise<void> {
        for (const file of files) {
            await this.handleSingleFileImport(document, file);
        }
    }

    private async handleSingleFileImport(document: IDocument, file: File) {
        const nodeResult = file.name.endsWith(".brep")
            ? await importBrep(document, file)
            : await this.handleStepIgesImport(document, file);

        if (!nodeResult?.isOk) return;

        const node = nodeResult.value;
        node.name = file.name;
        document.addNode(node);
        document.visual.update();
    }

    private async handleStepIgesImport(document: IDocument, file: File) {
        const content = new Uint8Array(await file.arrayBuffer());

        if (this.isStepFile(file.name)) {
            return document.application.shapeFactory.converter.convertFromSTEP(document, content);
        }

        if (this.isIgesFile(file.name)) {
            return document.application.shapeFactory.converter.convertFromIGES(document, content);
        }

        alert(I18n.translate("error.import.unsupportedFileType:{0}", file.name));
        return undefined;
    }

    async export(type: string, nodes: VisualNode[]): Promise<BlobPart[] | undefined> {
        if (!this.validateExportType(type)) return;

        const shapes = this.getExportShapes(nodes);
        if (!shapes.length) return;
        let datashapeResult;
        if (type === ".dxf") {
            datashapeResult = this.handleDxfExport(nodes);
        } else {
            const shapeResult = await this.convertShapes(type, nodes[0].document, shapes);
            datashapeResult = this.handleExportResult(shapeResult);
        }
        return datashapeResult;
    }

    private async handleDxfExport(nodes: VisualNode[]): Promise<string[]> {
        // 创建一个新的 DXF 文档
        // const d = new DxfDocument();
        const lines = [];
        for (const node of nodes) {
            if (node instanceof LineNode) {
                lines.push({
                    start: {
                        x: parseFloat(node.start.x.toFixed(1)),
                        y: parseFloat(node.start.y.toFixed(1)),
                        z: parseFloat(node.start.z.toFixed(1)),
                    },
                    end: {
                        x: parseFloat(node.end.x.toFixed(1)),
                        y: parseFloat(node.end.y.toFixed(1)),
                        z: parseFloat(node.end.z.toFixed(1)),
                    },
                });
            }
        }
        const response = await fetch("http://localhost:8737/dxf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lines }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Network response was not ok: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();

        // 返回分割成行的数组，每行后加上换行符
        return data["result"].split("\n").map((line: string) => line + "\n");
    }

    private validateExportType(type: string): boolean {
        const isValid = this.exportFormats().includes(type);
        !isValid && PubSub.default.pub("showToast", "error.import.unsupportedFileType:{0}", type);
        return isValid;
    }

    private getExportShapes(nodes: VisualNode[]): IShape[] {
        const shapes = nodes.filter((x): x is ShapeNode => x instanceof ShapeNode).map((x) => x.shape.value);

        !shapes.length && PubSub.default.pub("showToast", "error.export.noNodeCanBeExported");
        return shapes;
    }

    private async convertShapes(type: string, doc: IDocument, shapes: IShape[]) {
        if (type === ".step") return this.handleStepExport(doc, shapes);
        if (type === ".iges") return this.handleIgesExport(doc, shapes);
        return exportBrep(doc, shapes);
    }

    private handleStepExport(doc: IDocument, shapes: IShape[]) {
        return doc.application.shapeFactory.converter.convertToSTEP(...shapes);
    }

    private handleIgesExport(doc: IDocument, shapes: IShape[]) {
        return doc.application.shapeFactory.converter.convertToIGES(...shapes);
    }

    private handleExportResult(result: Result<string> | undefined) {
        if (!result?.isOk) {
            PubSub.default.pub("showToast", "error.default:{0}", result?.error);
            return undefined;
        }
        return [result.value];
    }

    private isStepFile(filename: string) {
        return filename.endsWith(".step") || filename.endsWith(".stp");
    }

    private isIgesFile(filename: string) {
        return filename.endsWith(".iges") || filename.endsWith(".igs");
    }
}
