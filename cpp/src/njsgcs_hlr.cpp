#include <BRepPrimAPI_MakeBox.hxx>  
#include <BRepPrimAPI_MakeCylinder.hxx>  
#include <BRepAlgoAPI_Cut.hxx>  
#include <gp_Pnt.hxx>  
#include <gp_Dir.hxx>  
#include <gp_Ax2.hxx>  
#include <HLRBRep_Algo.hxx>  
#include <HLRBRep_HLRToShape.hxx>  
#include <HLRAlgo_Projector.hxx>  
#include <BRepAdaptor_Curve.hxx>  
#include <GCPnts_UniformDeflection.hxx>  
#include <TopExp_Explorer.hxx>  
#include <TopoDS.hxx>  
#include <vector>  
#include <emscripten/bind.h>
#include <tuple>
#include <BRep_Tool.hxx>
#include <TopExp_Explorer.hxx>
#include <TopoDS_Edge.hxx>
#include <Geom_Line.hxx>
using namespace emscripten;
std::vector<std::pair<gp_Pnt, gp_Pnt>> ExtractLineSegments(const TopoDS_Shape& shape) {  
    std::vector<std::pair<gp_Pnt, gp_Pnt>> lineSegments;  
      
    for (TopExp_Explorer edgeExplorer(shape, TopAbs_EDGE); edgeExplorer.More(); edgeExplorer.Next()) {  
        TopoDS_Edge edge = TopoDS::Edge(edgeExplorer.Current());  
          
        // 优先使用顶点方法  
        TopoDS_Vertex aFirst, aLast;  
        TopExp::Vertices(edge, aFirst, aLast, Standard_True);  
          
        if (!aFirst.IsNull() && !aLast.IsNull()) {  
            gp_Pnt startPnt = BRep_Tool::Pnt(aFirst);  
            gp_Pnt endPnt = BRep_Tool::Pnt(aLast);  
            lineSegments.emplace_back(startPnt, endPnt);  
            //std::cout << "startPnt: X=" << startPnt.X() << " Y=" << startPnt.Y() << " Z=" << startPnt.Z() << std::endl;
        } 
    }  
      
    return lineSegments;  
}
// Convert 3D edge to 2D points  
struct ProjectionResult {
    std::vector<std::pair<gp_Pnt, gp_Pnt>> visible;
    std::vector<std::pair<gp_Pnt, gp_Pnt>> hidden;
    ProjectionResult(
        const std::vector<std::pair<gp_Pnt, gp_Pnt>>& vis,
        const std::vector<std::pair<gp_Pnt, gp_Pnt>>& hid
    ) : visible(vis), hidden(hid) {}
};

class ShapeProjection {  
    public:  
      
    static ProjectionResult GetProjectionEdges(const TopoDS_Shape& shape, const gp_Dir& direction) {  
        // Create projector  
        
        gp_Ax3 viewAxis(gp_Pnt(0, 0, 0), direction);  
        gp_Trsf transformation;  
        transformation.SetTransformation(viewAxis);  
        HLRAlgo_Projector projector(transformation, Standard_False, 0.0);
          
        // Create HLR algorithm  
        Handle(HLRBRep_Algo) hlr_algo = new HLRBRep_Algo();  
        hlr_algo->Add(shape);  
        hlr_algo->Projector(projector);  
        hlr_algo->Update();  
        hlr_algo->Hide();  
          
        // Extract visible and hidden edges  
        HLRBRep_HLRToShape hlr_to_shape(hlr_algo);  
        TopoDS_Shape visible_edges = hlr_to_shape.VCompound();  
        TopoDS_Shape hidden_edges = hlr_to_shape.HCompound();  
        auto visible_line_segments = ExtractLineSegments(visible_edges);
    auto hidden_line_segments = ExtractLineSegments(hidden_edges);  
    
    return ProjectionResult(visible_line_segments, hidden_line_segments); 
    }  
    };  
    using LineSegment = std::pair<gp_Pnt, gp_Pnt>;
    using LineSegmentList = std::vector<LineSegment>;
EMSCRIPTEN_BINDINGS(Shape_Projection) {
    value_object<LineSegment>("LineSegment")
        .field("first", &LineSegment::first)
        .field("second", &LineSegment::second);

    
    register_vector<LineSegment>("LineSegmentList");
    class_<ProjectionResult>("ProjectionResult")
    .property("visible", &ProjectionResult::visible)
    .property("hidden", &ProjectionResult::hidden);
    class_<ShapeProjection>("ShapeProjection")
        .class_function("projection", &ShapeProjection::GetProjectionEdges);


    
  
}
