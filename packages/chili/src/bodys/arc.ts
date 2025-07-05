// Part of the Chili3d Project, under the AGPL-3.0 License.
// See LICENSE file in the project root for full license information.

import {
    I18nKeys,
    IDocument,
    IShape,
    ParameterShapeNode,
    Property,
    Result,
    Serializer,
    XYZ,
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
    @Property.define("arc.angle")
    get angle() {
        return this.getPrivateValue("angle");
    }
    set angle(value: number) {
        this.setPropertyEmitShapeChanged("angle", value);
    }
        @Property.define("arc.end")
    get end(): XYZ {
        return this.getPrivateValue("end");
    }
    set end(value: XYZ) {
        this.setPropertyEmitShapeChanged("end", value);
    }

constructor(document: IDocument, normal: XYZ, center: XYZ, start: XYZ, angle: number) {
    super(document);
    this.setPrivateValue("normal", normal);
    this.setPrivateValue("center", center);
    this.setPrivateValue("start", start);
    this.setPrivateValue("angle", angle);

    let end: XYZ;

    if (normal.x === 0 && normal.y === 0 && normal.z === 1) {
        // XY 平面
        const endx = parseFloat((this.start.x + Math.cos(this.angle)).toFixed(1));
        const endy = parseFloat((this.start.y + Math.sin(this.angle)).toFixed(1));
        const endz = parseFloat(this.start.z.toFixed(1));
        end = new XYZ(endx, endy, endz);
    } else if (normal.x === 0 && normal.y === 1 && normal.z === 0) {
        // XZ 平面，绕 Y 轴旋转
        const endx = parseFloat((this.start.x + Math.cos(this.angle)).toFixed(1));
        const endz = parseFloat((this.start.z + Math.sin(this.angle)).toFixed(1));
        const endy = parseFloat(this.start.y.toFixed(1));
        end = new XYZ(endx, endy, endz);
    } else if (normal.x === 1 && normal.y === 0 && normal.z === 0) {
        // YZ 平面，绕 X 轴旋转
        const endy = parseFloat((this.start.y + Math.cos(this.angle)).toFixed(1));
        const endz = parseFloat((this.start.z + Math.sin(this.angle)).toFixed(1));
        const endx = parseFloat(this.start.x.toFixed(1));
        end = new XYZ(endx, endy, endz);
    } else {
        // 默认 fallback：不自动计算 end，或抛出警告
        end = new XYZ(0, 0, 0); // 或 throw new Error("Unsupported normal direction");
    }

    this.setPrivateValue("end", end);
}

    generateShape(): Result<IShape, string> {
        return this.document.application.shapeFactory.arc(this.normal, this.center, this.start, this.angle);
    }
}
