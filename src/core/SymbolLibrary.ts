import { CADBlockDefinition, Point2D } from './types';

/**
 * Standard CAD Symbol Library
 * Comprehensive catalog of parametric architectural, electrical, mechanical, and annotation symbols.
 */
export const STANDARD_SYMBOLS: CADBlockDefinition[] = [
  // ---------------------------------------------------------------------------
  // 1. ARCHITECTURE & CIVIL
  // ---------------------------------------------------------------------------
  {
    id: 'sym_door_80',
    name: 'DOOR_80',
    description: 'Single Door 80cm with swing arc and frame',
    category: 'architecture',
    basePoint: { x: 0, y: 0 },
    attributes: [
      { tag: 'DOOR_ID', prompt: 'Door Identification', defaultValue: 'P01', position: { x: 40, y: 40 }, fontSize: 10 },
      { tag: 'WIDTH', prompt: 'Width (m)', defaultValue: '0.80', position: { x: 40, y: 25 }, fontSize: 8 },
    ],
    entities: [
      // Frame post left
      { id: 'df_1', type: 'rectangle', layerId: '0', origin: { x: -5, y: -5 }, width: 5, height: 15 },
      // Frame post right
      { id: 'df_2', type: 'rectangle', layerId: '0', origin: { x: 80, y: -5 }, width: 5, height: 15 },
      // Door leaf (opened at 90 deg)
      { id: 'df_3', type: 'rectangle', layerId: '0', origin: { x: 0, y: 0 }, width: 4, height: 80 },
      // Swing arc (90 deg from 0 to PI/2)
      { id: 'df_4', type: 'arc', layerId: '0', center: { x: 0, y: 0 }, radius: 80, startAngle: 0, endAngle: Math.PI / 2 },
    ],
  },
  {
    id: 'sym_door_double_160',
    name: 'DOOR_DOUBLE_160',
    description: 'Double Door 160cm with dual swing arcs',
    category: 'architecture',
    basePoint: { x: 80, y: 0 },
    attributes: [
      { tag: 'DOOR_ID', prompt: 'Door Identification', defaultValue: 'P02', position: { x: 80, y: 40 }, fontSize: 10 },
    ],
    entities: [
      // Left leaf & swing
      { id: 'dd_1', type: 'rectangle', layerId: '0', origin: { x: 0, y: 0 }, width: 4, height: 80 },
      { id: 'dd_2', type: 'arc', layerId: '0', center: { x: 0, y: 0 }, radius: 80, startAngle: 0, endAngle: Math.PI / 2 },
      // Right leaf & swing
      { id: 'dd_3', type: 'rectangle', layerId: '0', origin: { x: 156, y: 0 }, width: 4, height: 80 },
      { id: 'dd_4', type: 'arc', layerId: '0', center: { x: 160, y: 0 }, radius: 80, startAngle: Math.PI / 2, endAngle: Math.PI },
      // Frames
      { id: 'dd_5', type: 'rectangle', layerId: '0', origin: { x: -5, y: -5 }, width: 5, height: 15 },
      { id: 'dd_6', type: 'rectangle', layerId: '0', origin: { x: 160, y: -5 }, width: 5, height: 15 },
    ],
  },
  {
    id: 'sym_window_120',
    name: 'WINDOW_120',
    description: 'Standard Window 120cm with double glazing representation',
    category: 'architecture',
    basePoint: { x: 0, y: 0 },
    attributes: [
      { tag: 'WIN_ID', prompt: 'Window Tag', defaultValue: 'J01', position: { x: 60, y: 25 }, fontSize: 10 },
      { tag: 'SILL', prompt: 'Sill Height', defaultValue: '1.00m', position: { x: 60, y: -15 }, fontSize: 8 },
    ],
    entities: [
      // Outer sill lines (wall thickness = 15cm)
      { id: 'wf_1', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: 120, y: 0 } },
      { id: 'wf_2', type: 'line', layerId: '0', start: { x: 0, y: 15 }, end: { x: 120, y: 15 } },
      // Side wall cut lines
      { id: 'wf_3', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: 0, y: 15 } },
      { id: 'wf_4', type: 'line', layerId: '0', start: { x: 120, y: 0 }, end: { x: 120, y: 15 } },
      // Glazing inner panes
      { id: 'wf_5', type: 'line', layerId: '0', start: { x: 0, y: 6 }, end: { x: 120, y: 6 } },
      { id: 'wf_6', type: 'line', layerId: '0', start: { x: 0, y: 9 }, end: { x: 120, y: 9 } },
    ],
  },
  {
    id: 'sym_toilet_top',
    name: 'TOILET_BOWL',
    description: 'Toilet / WC Top View with cistern and seat',
    category: 'architecture',
    basePoint: { x: 22.5, y: 0 },
    attributes: [],
    entities: [
      // Cistern box 45 x 20
      { id: 'tb_1', type: 'rectangle', layerId: '0', origin: { x: 0, y: 0 }, width: 45, height: 20 },
      // Bowl ellipse / rounded profile
      { id: 'tb_2', type: 'ellipse', layerId: '0', center: { x: 22.5, y: 40 }, radiusX: 18, radiusY: 22, rotation: 0, startAngle: 0, endAngle: Math.PI * 2 },
      { id: 'tb_3', type: 'ellipse', layerId: '0', center: { x: 22.5, y: 40 }, radiusX: 13, radiusY: 16, rotation: 0, startAngle: 0, endAngle: Math.PI * 2 },
    ],
  },
  {
    id: 'sym_sink_bath',
    name: 'SINK_VANITY',
    description: 'Bathroom Basin & Vanity Counter',
    category: 'architecture',
    basePoint: { x: 30, y: 0 },
    attributes: [],
    entities: [
      // Counter 60 x 45
      { id: 'sb_1', type: 'rectangle', layerId: '0', origin: { x: 0, y: 0 }, width: 60, height: 45 },
      // Sink oval
      { id: 'sb_2', type: 'ellipse', layerId: '0', center: { x: 30, y: 22.5 }, radiusX: 22, radiusY: 14, rotation: 0, startAngle: 0, endAngle: Math.PI * 2 },
      // Faucet circle
      { id: 'sb_3', type: 'circle', layerId: '0', center: { x: 30, y: 8 }, radius: 2.5 },
    ],
  },
  {
    id: 'sym_bed_double',
    name: 'BED_QUEEN',
    description: 'Double Queen Bed 160x200cm with Pillows',
    category: 'architecture',
    basePoint: { x: 80, y: 0 },
    attributes: [],
    entities: [
      // Mattress 160 x 200
      { id: 'bd_1', type: 'rectangle', layerId: '0', origin: { x: 0, y: 0 }, width: 160, height: 200 },
      // Headboard line
      { id: 'bd_2', type: 'line', layerId: '0', start: { x: 0, y: 15 }, end: { x: 160, y: 15 } },
      // Pillow 1
      { id: 'bd_3', type: 'rectangle', layerId: '0', origin: { x: 15, y: 25 }, width: 55, height: 35 },
      // Pillow 2
      { id: 'bd_4', type: 'rectangle', layerId: '0', origin: { x: 90, y: 25 }, width: 55, height: 35 },
      // Blanket fold line
      { id: 'bd_5', type: 'line', layerId: '0', start: { x: 0, y: 80 }, end: { x: 160, y: 80 } },
    ],
  },
  {
    id: 'sym_table_chairs',
    name: 'TABLE_4CHAIRS',
    description: 'Dining Table 120x80cm with 4 Chairs',
    category: 'architecture',
    basePoint: { x: 60, y: 40 },
    attributes: [],
    entities: [
      // Table 120x80
      { id: 'tc_1', type: 'rectangle', layerId: '0', origin: { x: 0, y: 0 }, width: 120, height: 80 },
      // Top chair 1
      { id: 'tc_2', type: 'rectangle', layerId: '0', origin: { x: 20, y: 85 }, width: 35, height: 25 },
      // Top chair 2
      { id: 'tc_3', type: 'rectangle', layerId: '0', origin: { x: 65, y: 85 }, width: 35, height: 25 },
      // Bottom chair 1
      { id: 'tc_4', type: 'rectangle', layerId: '0', origin: { x: 20, y: -30 }, width: 35, height: 25 },
      // Bottom chair 2
      { id: 'tc_5', type: 'rectangle', layerId: '0', origin: { x: 65, y: -30 }, width: 35, height: 25 },
    ],
  },
  {
    id: 'sym_car_sedan',
    name: 'CAR_PARKING',
    description: 'Parking Space 250x500cm with Sedan Silhouette',
    category: 'civil',
    basePoint: { x: 125, y: 0 },
    attributes: [
      { tag: 'VAGA_NO', prompt: 'Parking Space Number', defaultValue: 'V01', position: { x: 125, y: 20 }, fontSize: 14 },
    ],
    entities: [
      // Parking boundary
      { id: 'cp_1', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: 0, y: 500 } },
      { id: 'cp_2', type: 'line', layerId: '0', start: { x: 250, y: 0 }, end: { x: 250, y: 500 } },
      { id: 'cp_3', type: 'line', layerId: '0', start: { x: 0, y: 500 }, end: { x: 250, y: 500 } },
      // Car body (180 x 440)
      { id: 'cp_4', type: 'rectangle', layerId: '0', origin: { x: 35, y: 30 }, width: 180, height: 440 },
      // Windshield front
      { id: 'cp_5', type: 'line', layerId: '0', start: { x: 50, y: 350 }, end: { x: 200, y: 350 } },
      // Windshield rear
      { id: 'cp_6', type: 'line', layerId: '0', start: { x: 50, y: 150 }, end: { x: 200, y: 150 } },
      // Roof side lines
      { id: 'cp_7', type: 'line', layerId: '0', start: { x: 50, y: 150 }, end: { x: 50, y: 350 } },
      { id: 'cp_8', type: 'line', layerId: '0', start: { x: 200, y: 150 }, end: { x: 200, y: 350 } },
    ],
  },
  {
    id: 'sym_tree',
    name: 'TREE_CANOPY',
    description: 'Landscape Architecture Tree Canopy',
    category: 'architecture',
    basePoint: { x: 0, y: 0 },
    attributes: [],
    entities: [
      // Outer canopy
      { id: 'tr_1', type: 'circle', layerId: '0', center: { x: 0, y: 0 }, radius: 60 },
      { id: 'tr_2', type: 'circle', layerId: '0', center: { x: 0, y: 0 }, radius: 55 },
      // Center trunk
      { id: 'tr_3', type: 'circle', layerId: '0', center: { x: 0, y: 0 }, radius: 6 },
      // Branch rays
      { id: 'tr_4', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: 45, y: 35 } },
      { id: 'tr_5', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: -40, y: 38 } },
      { id: 'tr_6', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: -35, y: -45 } },
      { id: 'tr_7', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: 42, y: -40 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. ELECTRICAL
  // ---------------------------------------------------------------------------
  {
    id: 'sym_elec_outlet_110',
    name: 'ELEC_OUTLET_110V',
    description: 'Wall Low Power Outlet 110V (Tomada Baixa)',
    category: 'electrical',
    basePoint: { x: 0, y: 0 },
    attributes: [
      { tag: 'CIRCUIT', prompt: 'Circuit No', defaultValue: 'C1', position: { x: 16, y: 8 }, fontSize: 9 },
      { tag: 'POWER', prompt: 'Power (W)', defaultValue: '100W', position: { x: 16, y: -4 }, fontSize: 7 },
    ],
    entities: [
      // Wall mounting base line
      { id: 'eo_1', type: 'line', layerId: '0', start: { x: 0, y: -10 }, end: { x: 0, y: 10 } },
      // Semicircle arc (radius 10)
      { id: 'eo_2', type: 'arc', layerId: '0', center: { x: 0, y: 0 }, radius: 10, startAngle: -Math.PI / 2, endAngle: Math.PI / 2 },
    ],
  },
  {
    id: 'sym_elec_outlet_220',
    name: 'ELEC_OUTLET_220V',
    description: 'Wall High Power Outlet 220V (Tomada Alta Chuveiro)',
    category: 'electrical',
    basePoint: { x: 0, y: 0 },
    attributes: [
      { tag: 'CIRCUIT', prompt: 'Circuit No', defaultValue: 'C4', position: { x: 16, y: 8 }, fontSize: 9 },
      { tag: 'POWER', prompt: 'Power (W)', defaultValue: '5500W', position: { x: 16, y: -4 }, fontSize: 7 },
    ],
    entities: [
      { id: 'e2_1', type: 'line', layerId: '0', start: { x: 0, y: -10 }, end: { x: 0, y: 10 } },
      { id: 'e2_2', type: 'arc', layerId: '0', center: { x: 0, y: 0 }, radius: 10, startAngle: -Math.PI / 2, endAngle: Math.PI / 2 },
      // Filled half hatch representation
      {
        id: 'e2_3',
        type: 'hatch',
        layerId: '0',
        boundary: [
          { x: 0, y: -10 },
          { x: 8, y: -6 },
          { x: 10, y: 0 },
          { x: 0, y: 0 },
        ],
        pattern: 'SOLID',
        scale: 1,
        angle: 0,
        fillColor: '#007acc',
      },
    ],
  },
  {
    id: 'sym_elec_light_ceiling',
    name: 'ELEC_LIGHT_CEILING',
    description: 'Ceiling Luminaire / Light Point (Ponto de Luz no Teto)',
    category: 'electrical',
    basePoint: { x: 0, y: 0 },
    attributes: [
      { tag: 'CIRCUIT', prompt: 'Circuit No', defaultValue: '1', position: { x: -6, y: 8 }, fontSize: 8 },
      { tag: 'POWER', prompt: 'Power', defaultValue: '100W', position: { x: -10, y: -18 }, fontSize: 8 },
      { tag: 'SWITCH', prompt: 'Switch Command Tag', defaultValue: 'a', position: { x: 6, y: 8 }, fontSize: 8 },
    ],
    entities: [
      { id: 'el_1', type: 'circle', layerId: '0', center: { x: 0, y: 0 }, radius: 15 },
      // Horizontal division line
      { id: 'el_2', type: 'line', layerId: '0', start: { x: -15, y: 0 }, end: { x: 15, y: 0 } },
      // Top vertical divider
      { id: 'el_3', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: 0, y: 15 } },
    ],
  },
  {
    id: 'sym_elec_switch',
    name: 'ELEC_SWITCH_SINGLE',
    description: 'Single Wall Switch (Interruptor Simples)',
    category: 'electrical',
    basePoint: { x: 0, y: 0 },
    attributes: [
      { tag: 'COMMAND', prompt: 'Switch Command', defaultValue: 'a', position: { x: 8, y: 12 }, fontSize: 10 },
    ],
    entities: [
      { id: 'es_1', type: 'circle', layerId: '0', center: { x: 0, y: 0 }, radius: 6 },
      { id: 'es_2', type: 'line', layerId: '0', start: { x: 0, y: 6 }, end: { x: 0, y: 16 } },
      { id: 'es_3', type: 'line', layerId: '0', start: { x: 0, y: 16 }, end: { x: 8, y: 16 } },
    ],
  },
  {
    id: 'sym_elec_qdc',
    name: 'ELEC_PANEL_QDC',
    description: 'Electrical Distribution Board (Quadro Geral / QDC)',
    category: 'electrical',
    basePoint: { x: 0, y: 0 },
    attributes: [
      { tag: 'PANEL_ID', prompt: 'Panel Identification', defaultValue: 'QDC-01', position: { x: 25, y: 25 }, fontSize: 10 },
    ],
    entities: [
      { id: 'eq_1', type: 'rectangle', layerId: '0', origin: { x: 0, y: 0 }, width: 50, height: 20 },
      { id: 'eq_2', type: 'line', layerId: '0', start: { x: 0, y: 0 }, end: { x: 50, y: 20 } },
      {
        id: 'eq_3',
        type: 'hatch',
        layerId: '0',
        boundary: [
          { x: 0, y: 0 },
          { x: 50, y: 20 },
          { x: 0, y: 20 },
        ],
        pattern: 'SOLID',
        scale: 1,
        angle: 0,
        fillColor: '#e06c75',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. MECHANICAL & STRUCTURAL
  // ---------------------------------------------------------------------------
  {
    id: 'sym_beam_i',
    name: 'BEAM_I_SECTION',
    description: 'Structural Steel I-Beam Profile (W200x26)',
    category: 'mechanical',
    basePoint: { x: 50, y: 100 },
    attributes: [
      { tag: 'PROFILE', prompt: 'Profile Description', defaultValue: 'W200x26', position: { x: 50, y: 210 }, fontSize: 10 },
    ],
    entities: [
      // Top Flange
      { id: 'bi_1', type: 'rectangle', layerId: '0', origin: { x: 0, y: 180 }, width: 100, height: 20 },
      // Web
      { id: 'bi_2', type: 'rectangle', layerId: '0', origin: { x: 42, y: 20 }, width: 16, height: 160 },
      // Bottom Flange
      { id: 'bi_3', type: 'rectangle', layerId: '0', origin: { x: 0, y: 0 }, width: 100, height: 20 },
    ],
  },
  {
    id: 'sym_bolt_hex',
    name: 'BOLT_HEX_M12',
    description: 'Hexagonal Bolt with Thread representation',
    category: 'mechanical',
    basePoint: { x: 0, y: 0 },
    attributes: [
      { tag: 'SIZE', prompt: 'Bolt Spec', defaultValue: 'M12x50', position: { x: 20, y: 0 }, fontSize: 8 },
    ],
    entities: [
      // Hex head
      { id: 'bh_1', type: 'rectangle', layerId: '0', origin: { x: -12, y: -8 }, width: 24, height: 8 },
      // Shank
      { id: 'bh_2', type: 'rectangle', layerId: '0', origin: { x: -6, y: -45 }, width: 12, height: 37 },
      // Thread lines
      { id: 'bh_3', type: 'line', layerId: '0', start: { x: -6, y: -20 }, end: { x: 6, y: -22 } },
      { id: 'bh_4', type: 'line', layerId: '0', start: { x: -6, y: -28 }, end: { x: 6, y: -30 } },
      { id: 'bh_5', type: 'line', layerId: '0', start: { x: -6, y: -36 }, end: { x: 6, y: -38 } },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. ANNOTATION & GENERAL SYMBOLS
  // ---------------------------------------------------------------------------
  {
    id: 'sym_north_arrow',
    name: 'NORTH_ARROW',
    description: 'Cartographic North Arrow Symbol',
    category: 'symbols',
    basePoint: { x: 0, y: 0 },
    attributes: [],
    entities: [
      // Outer ring
      { id: 'na_1', type: 'circle', layerId: '0', center: { x: 0, y: 0 }, radius: 25 },
      // Arrow points
      { id: 'na_2', type: 'line', layerId: '0', start: { x: 0, y: 35 }, end: { x: -8, y: -10 } },
      { id: 'na_3', type: 'line', layerId: '0', start: { x: 0, y: 35 }, end: { x: 8, y: -10 } },
      { id: 'na_4', type: 'line', layerId: '0', start: { x: 0, y: 35 }, end: { x: 0, y: -20 } },
      // Filled half needle
      {
        id: 'na_5',
        type: 'hatch',
        layerId: '0',
        boundary: [
          { x: 0, y: 35 },
          { x: 0, y: -10 },
          { x: -8, y: -10 },
        ],
        pattern: 'SOLID',
        scale: 1,
        angle: 0,
        fillColor: '#e06c75',
      },
      // Letter 'N'
      { id: 'na_6', type: 'text', layerId: '0', position: { x: -4, y: 48 }, text: 'N', fontSize: 14 },
    ],
  },
  {
    id: 'sym_level_elevation',
    name: 'LEVEL_ELEVATION',
    description: 'Floor Elevation Level Marker (+0.00)',
    category: 'symbols',
    basePoint: { x: 0, y: 0 },
    attributes: [
      { tag: 'LEVEL', prompt: 'Level Value', defaultValue: '+0.00', position: { x: 18, y: 4 }, fontSize: 10 },
    ],
    entities: [
      // Target circle
      { id: 'le_1', type: 'circle', layerId: '0', center: { x: 0, y: 0 }, radius: 12 },
      // Cross lines
      { id: 'le_2', type: 'line', layerId: '0', start: { x: -16, y: 0 }, end: { x: 16, y: 0 } },
      { id: 'le_3', type: 'line', layerId: '0', start: { x: 0, y: -16 }, end: { x: 0, y: 16 } },
      // Quadrant 1 hatch
      {
        id: 'le_4',
        type: 'hatch',
        layerId: '0',
        boundary: [
          { x: 0, y: 0 },
          { x: 12, y: 0 },
          { x: 0, y: 12 },
        ],
        pattern: 'SOLID',
        scale: 1,
        angle: 0,
        fillColor: '#abb2bf',
      },
      // Quadrant 3 hatch
      {
        id: 'le_5',
        type: 'hatch',
        layerId: '0',
        boundary: [
          { x: 0, y: 0 },
          { x: -12, y: 0 },
          { x: 0, y: -12 },
        ],
        pattern: 'SOLID',
        scale: 1,
        angle: 0,
        fillColor: '#abb2bf',
      },
    ],
  },
  {
    id: 'sym_column_grid_axis',
    name: 'GRID_AXIS_BUBBLE',
    description: 'Structural Grid Axis Bubble with Tag',
    category: 'symbols',
    basePoint: { x: 0, y: 0 },
    attributes: [
      { tag: 'AXIS_TAG', prompt: 'Axis Identification', defaultValue: 'A', position: { x: -4, y: 4 }, fontSize: 12 },
    ],
    entities: [
      { id: 'ga_1', type: 'circle', layerId: '0', center: { x: 0, y: 0 }, radius: 15 },
      { id: 'ga_2', type: 'line', layerId: '0', start: { x: 0, y: -15 }, end: { x: 0, y: -45 } },
    ],
  },
  {
    id: 'sym_title_block_stamp',
    name: 'TITLE_BLOCK_STAMP',
    description: 'Technical Drawing Title Block / Selo ABNT',
    category: 'symbols',
    basePoint: { x: 0, y: 0 },
    attributes: [
      { tag: 'PROJECT', prompt: 'Project Name', defaultValue: 'PROJETO RESIDENCIAL', position: { x: 10, y: 45 }, fontSize: 10 },
      { tag: 'TITLE', prompt: 'Drawing Sheet Title', defaultValue: 'PLANTA BAIXA - TÉRREO', position: { x: 10, y: 30 }, fontSize: 11 },
      { tag: 'SCALE', prompt: 'Scale', defaultValue: '1:50', position: { x: 10, y: 12 }, fontSize: 9 },
      { tag: 'DATE', prompt: 'Date', defaultValue: '2026-10-03', position: { x: 70, y: 12 }, fontSize: 9 },
      { tag: 'AUTHOR', prompt: 'Author/Engineer', defaultValue: 'ENG. ALLAN LIMA', position: { x: 120, y: 12 }, fontSize: 9 },
    ],
    entities: [
      // Outer border 200 x 60
      { id: 'tb_box', type: 'rectangle', layerId: '0', origin: { x: 0, y: 0 }, width: 200, height: 60 },
      // Horizontal dividers
      { id: 'tb_h1', type: 'line', layerId: '0', start: { x: 0, y: 22 }, end: { x: 200, y: 22 } },
      { id: 'tb_h2', type: 'line', layerId: '0', start: { x: 0, y: 40 }, end: { x: 200, y: 40 } },
      // Vertical dividers in bottom row
      { id: 'tb_v1', type: 'line', layerId: '0', start: { x: 60, y: 0 }, end: { x: 60, y: 22 } },
      { id: 'tb_v2', type: 'line', layerId: '0', start: { x: 110, y: 0 }, end: { x: 110, y: 22 } },
      // Static labels
      { id: 'tb_l1', type: 'text', layerId: '0', position: { x: 10, y: 55 }, text: 'PROJETO:', fontSize: 6 },
      { id: 'tb_l2', type: 'text', layerId: '0', position: { x: 10, y: 38 }, text: 'CONTEÚDO:', fontSize: 6 },
      { id: 'tb_l3', type: 'text', layerId: '0', position: { x: 10, y: 19 }, text: 'ESCALA:', fontSize: 6 },
      { id: 'tb_l4', type: 'text', layerId: '0', position: { x: 70, y: 19 }, text: 'DATA:', fontSize: 6 },
      { id: 'tb_l5', type: 'text', layerId: '0', position: { x: 120, y: 19 }, text: 'RESPONSÁVEL:', fontSize: 6 },
    ],
  },
];
