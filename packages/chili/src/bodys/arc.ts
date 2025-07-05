// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.

import {
    I18nKeys,
    IDocument,
    IEdge,
    IShape,
    ParameterShapeNode,
    Property,
    Result,
    Serializer,
    XYZ
} from "chili-core";

@Serializer.register(["document", "normal", "center", "start", "angle"])
export class ArcNode extends ParameterShapeNode {
    override display(): I18nKeys {
        return "body.arc";
    }

    @Serializer.serialze()
    @Property.define("circle.center")
    get center() {
        return this.getPrivateValue("center");
    }
    set center(center: XYZ) {
        this.setPropertyEmitShapeChanged("center", center);
    }

    @Serializer.serialze()
    @Property.define("arc.start")
    get start(): XYZ {
        return this.getPrivateValue("start");
    }

    @Serializer.serialze()
    get normal(): XYZ {
        return this.getPrivateValue("normal");
    }

        @Serializer.serialze()
        @Property.define("arc.end")
    get end(): XYZ {
        return this.getPrivateValue("end");
    }
    set end(value: XYZ) {
        this.setPropertyEmitShapeChanged("end", value);
    }
    @Serializer.serialze()
    @Property.define("arc.angle")
    get angle() {
        return this.getPrivateValue("angle");
    }
    set angle(value: number) {
        this.setPropertyEmitShapeChanged("angle", value);
    }

constructor(document: IDocument, normal: XYZ, center: XYZ, start: XYZ, angle: number) {
    super(document);
    this.setPrivateValue("normal", normal);
    this.setPrivateValue("center", center);
    this.setPrivateValue("start", start);
    this.setPrivateValue("angle", angle);

    
    const edge=this.shape.value.copy()as unknown as IEdge; 
    const endPoint=edge.curve().endPoint();
    const startPoint=edge.curve().startPoint();

function pointsEqual(a: XYZ, b: XYZ): boolean {
    const tolerance = 0.1;
    return (
        Math.abs(a.x - b.x) < tolerance &&
        Math.abs(a.y - b.y) < tolerance &&
        Math.abs(a.z - b.z) < tolerance
    );
}   
    if(!pointsEqual(startPoint,start)){
         this.setPrivateValue("end", startPoint);
    }else{
        this.setPrivateValue("end", endPoint);
    }
   
}

    generateShape(): Result<IShape, string> {
        return this.document.application.shapeFactory.arc(this.normal, this.center, this.start, this.angle);
    }
}
