import { LineSegmentList, TopoDS_Shape } from "../lib/chili-wasm";
export { LineSegmentList, ProjectionResult2 };
interface ProjectionResult2 {
    f_visible:LineSegmentList ,
    f_hidden: LineSegmentList ,
    s_visible: LineSegmentList ,
    s_hidden: LineSegmentList ,
    t_visible: LineSegmentList ,
    t_hidden:LineSegmentList ,

}
export function getProjectionEdges(
    shape: TopoDS_Shape,
   
): { f_visible: LineSegmentList; f_hidden: LineSegmentList,s_visible: LineSegmentList; s_hidden: LineSegmentList,t_visible: LineSegmentList; t_hidden: LineSegmentList} {
    console.info("test1");
    const f_result = wasm.ShapeProjection.projection(shape, new wasm.gp_Dir(0, -1, 0));
    console.info("first:"+f_result.visible.get(0)?.first);
    const s_result = wasm.ShapeProjection.projection(shape, new wasm.gp_Dir(-1,0, 0));
    const t_result = wasm.ShapeProjection.projection(shape, new wasm.gp_Dir( 0, 0,-1));
   
    return {
        f_visible: f_result.visible,
        f_hidden: f_result.hidden,
        s_visible: s_result.visible,
        s_hidden: s_result.hidden,
        t_visible: t_result.visible,
        t_hidden: t_result.hidden,

    };
}