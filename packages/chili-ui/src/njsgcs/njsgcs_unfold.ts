import { ArcNode } from "chili";
import {
    IDocument,
    IEdge,
    ShapeNode
} from "chili-core";

export function unfold(document: IDocument): void {
    const arcnodes:ArcNode[]=[];
    const models=document.selection
                 .getSelectedNodes()
                 .map((x) => x as ShapeNode)
                 .filter((x) => {
                     if (x === undefined) return false;
                     let shape = x.shape.value;
                     if (shape === undefined) return false;
                     if (x instanceof ArcNode) {
                        arcnodes.push(x);
                               return false; // 排除 ArcNode 类型
                           }
                     return true;
                 });
        document.selection.clearSelection();
    const edges = models.map((x) => x.shape.value.copy()) as IEdge[];  
    


       
       

}
