import PptxGenJS from "pptxgenjs";

interface DashboardData {
  totalTonnage: number;
  totalTrucks: number;
  avgTonnage: number;
  operatorStats: any[];
  dailyTrend: any[];
}

export const generatePowerPoint = (data: DashboardData) => {
  const pres = new PptxGenJS();

  // --- SLIDE MASTER (Background & Footer) ---
  pres.defineSlideMaster({
    title: "MASTER_SLIDE",
    background: { color: "FFFFFF" },
    objects: [
      {
        rect: { x: 0, y: 0, w: "100%", h: 0.5, fill: { color: "1E40AF" } }, // Blue Header Bar
      },
      {
        text: {
          text: "ProTrack Adaptive Planning",
          options: { x: 0.5, y: 0.1, color: "FFFFFF", fontFace: "Arial", fontSize: 18, bold: true },
        },
      },
      {
        text: {
          text: `Generated: ${new Date().toLocaleDateString()}`,
          options: { x: 11.5, y: 0.15, color: "FFFFFF", fontSize: 10 },
        },
      },
    ],
  });

  // --- SLIDE 1: EXECUTIVE SUMMARY ---
  const slide1 = pres.addSlide({ masterName: "MASTER_SLIDE" });
  
  slide1.addText("Executive Production Summary", { x: 0.5, y: 1.0, fontSize: 24, bold: true, color: "1E40AF" });

  // KPI Boxes
  const kpiStyle = { x: 0.5, y: 2.0, w: 3.0, h: 1.5, fill: "F1F5F9", align: "center" as const };
  
  // KPI 1: Tonnage
  slide1.addShape(pres.ShapeType.rect, { ...kpiStyle, x: 0.5 });
  slide1.addText("Total Tonnage", { x: 0.6, y: 2.2, fontSize: 14, color: "64748B" });
  slide1.addText(`${data.totalTonnage.toLocaleString()} T`, { x: 0.6, y: 2.7, fontSize: 28, bold: true, color: "2563EB" });

  // KPI 2: Trucks
  slide1.addShape(pres.ShapeType.rect, { ...kpiStyle, x: 3.8 });
  slide1.addText("Total Trucks", { x: 3.9, y: 2.2, fontSize: 14, color: "64748B" });
  slide1.addText(`${data.totalTrucks}`, { x: 3.9, y: 2.7, fontSize: 28, bold: true, color: "8B5CF6" });

  // KPI 3: Avg Load
  slide1.addShape(pres.ShapeType.rect, { ...kpiStyle, x: 7.1 });
  slide1.addText("Avg Load / Truck", { x: 7.2, y: 2.2, fontSize: 14, color: "64748B" });
  slide1.addText(`${data.avgTonnage.toFixed(2)} T`, { x: 7.2, y: 2.7, fontSize: 28, bold: true, color: "10B981" });

  // Add Chart Placeholder (Image export is complex, so we add a data table summary instead)
  slide1.addText("Daily Trend Data (Last 7 Days)", { x: 0.5, y: 4.5, fontSize: 16, bold: true, color: "333333" });
  
  const trendRows = data.dailyTrend.slice(-7).map(d => [
    d.date, 
    d.tonnage.toLocaleString(), 
    d.trucks.toString()
  ]);

  slide1.addTable([
    [
      { text: "Date", options: { bold: true, fill: "E2E8F0" } }, 
      { text: "Tonnage", options: { bold: true, fill: "E2E8F0" } }, 
      { text: "Trucks", options: { bold: true, fill: "E2E8F0" } }
    ],
    ...trendRows
  ], {
    x: 0.5, y: 5.0, w: 6.0,
    border: { color: "C7C7C7" },
    fontSize: 12
  });

  // --- SLIDE 2: OPERATOR PERFORMANCE ---
  const slide2 = pres.addSlide({ masterName: "MASTER_SLIDE" });
  slide2.addText("Operator Performance Report", { x: 0.5, y: 1.0, fontSize: 24, bold: true, color: "1E40AF" });

  const opRows = data.operatorStats.slice(0, 10).map(op => [
    op.name,
    op.tonnage.toLocaleString(),
    op.trucks.toString(),
    (op.trucks > 0 ? (op.tonnage / op.trucks).toFixed(2) : "0")
  ]);

  slide2.addTable([
    [
      { text: "Operator Name", options: { bold: true, fill: "2563EB", color: "FFFFFF" } },
      { text: "Total Tonnage (T)", options: { bold: true, fill: "2563EB", color: "FFFFFF" } },
      { text: "Truck Count", options: { bold: true, fill: "2563EB", color: "FFFFFF" } },
      { text: "Avg Load", options: { bold: true, fill: "2563EB", color: "FFFFFF" } }
    ],
    ...opRows
  ], {
    x: 0.5, y: 1.5, w: "90%",
    rowH: 0.4,
    border: { pt: 1, color: "E2E8F0" },
    autoPage: true, // Auto-create new slides if table is too long
    fontSize: 11
  });

  // --- EXPORT ---
  pres.writeFile({ fileName: `ProTrack_Report_${new Date().toISOString().split('T')[0]}.pptx` });
};