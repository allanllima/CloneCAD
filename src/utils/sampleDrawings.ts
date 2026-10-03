import { CADCoreAPI, CADEntity } from '../core/types';

export function loadSampleDrawing(core: CADCoreAPI, type: 'architectural' | 'mechanical'): void {
  // Clear current entities
  const existing = core.getEntities();
  for (const ent of existing) {
    core.removeEntity(ent.id);
  }

  if (type === 'architectural') {
    // Ensure layers exist
    core.addLayer({
      id: 'walls',
      name: 'Walls',
      color: '#ffffff',
      visible: true,
      locked: false,
    });
    core.addLayer({
      id: 'doors',
      name: 'Doors',
      color: '#e5c07b',
      visible: true,
      locked: false,
    });
    core.addLayer({
      id: 'furniture',
      name: 'Furniture',
      color: '#61afef',
      visible: true,
      locked: false,
    });
    core.addLayer({
      id: 'dimensions',
      name: 'Dimensions',
      color: '#98c379',
      visible: true,
      locked: false,
    });

    const entities: CADEntity[] = [
      // Outer Walls (Rectangle / Lines)
      {
        id: 'wall_outer_rect',
        type: 'rectangle',
        layerId: 'walls',
        origin: { x: -300, y: -200 },
        width: 600,
        height: 400,
        visible: true,
      },
      // Interior dividing wall
      {
        id: 'wall_div_1',
        type: 'line',
        layerId: 'walls',
        start: { x: 0, y: -200 },
        end: { x: 0, y: 80 },
        visible: true,
      },
      {
        id: 'wall_div_2',
        type: 'line',
        layerId: 'walls',
        start: { x: 0, y: 140 },
        end: { x: 0, y: 200 },
        visible: true,
      },
      // Room 1 door swing (Arc + Line)
      {
        id: 'door_arc_1',
        type: 'arc',
        layerId: 'doors',
        center: { x: 0, y: 80 },
        radius: 60,
        startAngle: 0,
        endAngle: Math.PI / 2,
        visible: true,
      },
      {
        id: 'door_leaf_1',
        type: 'line',
        layerId: 'doors',
        start: { x: 0, y: 80 },
        end: { x: 60, y: 80 },
        visible: true,
      },
      // Meeting room table (Circle + Chairs)
      {
        id: 'table_circle',
        type: 'circle',
        layerId: 'furniture',
        center: { x: -150, y: 0 },
        radius: 70,
        visible: true,
      },
      {
        id: 'chair_1',
        type: 'circle',
        layerId: 'furniture',
        center: { x: -150, y: 100 },
        radius: 18,
        visible: true,
      },
      {
        id: 'chair_2',
        type: 'circle',
        layerId: 'furniture',
        center: { x: -150, y: -100 },
        radius: 18,
        visible: true,
      },
      {
        id: 'chair_3',
        type: 'circle',
        layerId: 'furniture',
        center: { x: -250, y: 0 },
        radius: 18,
        visible: true,
      },
      {
        id: 'chair_4',
        type: 'circle',
        layerId: 'furniture',
        center: { x: -50, y: 0 },
        radius: 18,
        visible: true,
      },
      // Desk in office (Rectangle)
      {
        id: 'desk_rect',
        type: 'rectangle',
        layerId: 'furniture',
        origin: { x: 80, y: 50 },
        width: 140,
        height: 70,
        visible: true,
      },
      // Executive Oval Boardroom Table (Ellipse)
      {
        id: 'boardroom_ellipse_table',
        type: 'ellipse',
        layerId: 'furniture',
        center: { x: 150, y: -80 },
        radiusX: 70,
        radiusY: 45,
        rotation: 0.1,
        startAngle: 0,
        endAngle: Math.PI * 2,
        visible: true,
      },
      // Landscape curved pathway (Spline)
      {
        id: 'garden_spline_path',
        type: 'spline',
        layerId: 'dimensions',
        controlPoints: [
          { x: -300, y: -250 },
          { x: -180, y: -280 },
          { x: -50, y: -240 },
          { x: 120, y: -290 },
          { x: 300, y: -260 },
        ],
        degree: 3,
        closed: false,
        visible: true,
      },
      // Wall insulation cross-hatch (Hatch ANSI31)
      {
        id: 'wall_hatch_sample',
        type: 'hatch',
        layerId: 'walls',
        boundary: [
          { x: -290, y: -190 },
          { x: -10, y: -190 },
          { x: -10, y: -170 },
          { x: -290, y: -170 },
        ],
        pattern: 'ANSI31',
        scale: 8,
        angle: Math.PI / 4,
        fillColor: '#ffffff',
        opacity: 0.2,
        visible: true,
      },
      // Decorative pool with rounded arc corners (Polyline with Bulges)
      {
        id: 'pool_bulge_poly',
        type: 'polyline',
        layerId: 'furniture',
        points: [
          { x: -280, y: 70, bulge: 0.414 }, // 90 deg rounded corner
          { x: -240, y: 110, bulge: 0 },
          { x: -220, y: 110, bulge: 0.414 },
          { x: -180, y: 70, bulge: 0 },
        ],
        closed: true,
        visible: true,
      },
      // Room Labels
      {
        id: 'label_conf',
        type: 'text',
        layerId: 'dimensions',
        position: { x: -200, y: 150 },
        text: 'CONFERENCE ROOM',
        fontSize: 16,
        visible: true,
      },
      {
        id: 'label_office',
        type: 'text',
        layerId: 'dimensions',
        position: { x: 80, y: 150 },
        text: 'EXECUTIVE OFFICE',
        fontSize: 16,
        visible: true,
      },
    ];

    entities.forEach((e) => core.addEntity(e, false));
    core.logCommandMessage('Loaded Architectural Sample Floorplan with Phase 1 primitives.');
  } else {
    // Mechanical Sample (Flange / Gear / Shaft)
    core.addLayer({
      id: 'outline',
      name: 'Outline',
      color: '#61afef',
      visible: true,
      locked: false,
    });
    core.addLayer({
      id: 'centerlines',
      name: 'Centerlines',
      color: '#e06c75',
      visible: true,
      locked: false,
    });
    core.addLayer({
      id: 'holes',
      name: 'Bolt Holes',
      color: '#98c379',
      visible: true,
      locked: false,
    });

    const entities: CADEntity[] = [
      // Outer flange circle
      {
        id: 'flange_outer',
        type: 'circle',
        layerId: 'outline',
        center: { x: 0, y: 0 },
        radius: 180,
        visible: true,
      },
      // Inner bore circle
      {
        id: 'flange_bore',
        type: 'circle',
        layerId: 'outline',
        center: { x: 0, y: 0 },
        radius: 60,
        visible: true,
      },
      // Bolt circle (pitch circle)
      {
        id: 'flange_pcd',
        type: 'circle',
        layerId: 'centerlines',
        center: { x: 0, y: 0 },
        radius: 120,
        visible: true,
      },
      // Centerlines
      {
        id: 'cl_h',
        type: 'line',
        layerId: 'centerlines',
        start: { x: -220, y: 0 },
        end: { x: 220, y: 0 },
        visible: true,
      },
      {
        id: 'cl_v',
        type: 'line',
        layerId: 'centerlines',
        start: { x: 0, y: -220 },
        end: { x: 0, y: 220 },
        visible: true,
      },
    ];

    // 6 bolt holes on pitch circle
    const boltRadius = 16;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      entities.push({
        id: `bolt_hole_${i}`,
        type: 'circle',
        layerId: 'holes',
        center: {
          x: Math.cos(angle) * 120,
          y: Math.sin(angle) * 120,
        },
        radius: boltRadius,
        visible: true,
      });
    }

    // Keyway slot in inner bore
    entities.push({
      id: 'keyway',
      type: 'rectangle',
      layerId: 'outline',
      origin: { x: -10, y: 55 },
      width: 20,
      height: 18,
      visible: true,
    });

    // Part Label
    entities.push({
      id: 'part_label',
      type: 'text',
      layerId: 'outline',
      position: { x: -160, y: -240 },
      text: 'FLANGE COUPLING - PCD Ø240',
      fontSize: 16,
      visible: true,
    });

    entities.forEach((e) => core.addEntity(e, false));
    core.logCommandMessage('Loaded Mechanical Flange Sample.');
  }

  core.zoomExtents();
}
