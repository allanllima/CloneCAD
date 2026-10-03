import { CADDimStyle, DimensionType } from './types';

export class DimStyleManager {
  private styles: Map<string, CADDimStyle> = new Map();
  private activeStyleId: string = 'standard';

  constructor() {
    this.registerDefaultStyles();
  }

  private registerDefaultStyles(): void {
    const defaultStyles: CADDimStyle[] = [
      {
        id: 'standard',
        name: 'Standard',
        arrowType: 'arrow',
        arrowSize: 2.5,
        textHeight: 2.5,
        textOffset: 1.0,
        extensionLineExtension: 1.25,
        extensionLineOffset: 0.625,
        unit: 'mm',
        precision: 2,
        scaleFactor: 1.0,
        prefix: '',
        suffix: '',
        decimalSeparator: '.',
        toleranceEnabled: false,
        toleranceUpper: 0,
        toleranceLower: 0,
      },
      {
        id: 'abnt_nbr_10126',
        name: 'ABNT NBR 10126',
        arrowType: 'arrow',
        arrowSize: 3.0,
        textHeight: 3.0,
        textOffset: 1.2,
        extensionLineExtension: 2.0,
        extensionLineOffset: 1.0,
        unit: 'mm',
        precision: 2,
        scaleFactor: 1.0,
        prefix: '',
        suffix: ' mm',
        decimalSeparator: ',',
        toleranceEnabled: false,
        toleranceUpper: 0,
        toleranceLower: 0,
      },
      {
        id: 'iso_25',
        name: 'ISO-25',
        arrowType: 'arrow',
        arrowSize: 2.5,
        textHeight: 2.5,
        textOffset: 1.0,
        extensionLineExtension: 1.25,
        extensionLineOffset: 0.625,
        unit: 'mm',
        precision: 2,
        scaleFactor: 1.0,
        prefix: '',
        suffix: '',
        decimalSeparator: '.',
        toleranceEnabled: false,
        toleranceUpper: 0,
        toleranceLower: 0,
      },
      {
        id: 'arch_tick',
        name: 'Architectural (Meters)',
        arrowType: 'tick',
        arrowSize: 2.0,
        textHeight: 2.5,
        textOffset: 1.0,
        extensionLineExtension: 1.5,
        extensionLineOffset: 0.8,
        unit: 'm',
        precision: 2,
        scaleFactor: 1.0,
        prefix: '',
        suffix: ' m',
        decimalSeparator: ',',
        toleranceEnabled: false,
        toleranceUpper: 0,
        toleranceLower: 0,
      },
      {
        id: 'mech_tolerance',
        name: 'Mechanical (Tolerances)',
        arrowType: 'arrow',
        arrowSize: 2.5,
        textHeight: 2.5,
        textOffset: 1.0,
        extensionLineExtension: 1.25,
        extensionLineOffset: 0.625,
        unit: 'mm',
        precision: 3,
        scaleFactor: 1.0,
        prefix: '',
        suffix: ' mm',
        decimalSeparator: '.',
        toleranceEnabled: true,
        toleranceUpper: 0.05,
        toleranceLower: -0.05,
      },
    ];

    for (const style of defaultStyles) {
      this.styles.set(style.id, style);
    }
  }

  public getStyles(): CADDimStyle[] {
    return Array.from(this.styles.values());
  }

  public getStyle(id: string): CADDimStyle | undefined {
    return this.styles.get(id);
  }

  public getActiveStyle(): CADDimStyle {
    return this.styles.get(this.activeStyleId) || this.styles.get('standard')!;
  }

  public setActiveStyle(id: string): void {
    if (this.styles.has(id)) {
      this.activeStyleId = id;
    }
  }

  public addStyle(style: CADDimStyle): void {
    this.styles.set(style.id, { ...style });
  }

  public updateStyle(id: string, changes: Partial<CADDimStyle>): void {
    const existing = this.styles.get(id);
    if (existing) {
      this.styles.set(id, { ...existing, ...changes });
    }
  }

  public deleteStyle(id: string): boolean {
    if (id === 'standard') return false; // Prevent deleting default
    const deleted = this.styles.delete(id);
    if (this.activeStyleId === id) {
      this.activeStyleId = 'standard';
    }
    return deleted;
  }

  /**
   * Formats a raw dimension measurement into standard technical text according to style settings
   */
  public formatMeasurement(
    rawMeasurement: number,
    dimType: DimensionType,
    style?: CADDimStyle,
    override?: string
  ): string {
    if (override && override.trim().length > 0) {
      if (override.includes('<>')) {
        const base = this.formatNumber(rawMeasurement, dimType, style);
        return override.replace('<>', base);
      }
      return override;
    }

    return this.formatNumber(rawMeasurement, dimType, style);
  }

  private formatNumber(
    rawMeasurement: number,
    dimType: DimensionType,
    customStyle?: CADDimStyle
  ): string {
    const style = customStyle || this.getActiveStyle();
    const factor = style.scaleFactor || 1.0;
    const scaled = rawMeasurement * factor;
    const precision = Math.max(0, Math.min(4, style.precision ?? 2));

    let formatted = scaled.toFixed(precision);
    if (style.decimalSeparator === ',') {
      formatted = formatted.replace('.', ',');
    }

    let prefix = style.prefix || '';
    let suffix = style.suffix || '';

    if (dimType === 'diameter') {
      prefix = `Ø ${prefix}`;
    } else if (dimType === 'radial') {
      prefix = `R ${prefix}`;
    } else if (dimType === 'angular') {
      suffix = `°${suffix}`;
    } else if (dimType === 'arc_length') {
      prefix = `⌒ ${prefix}`;
    }

    let result = `${prefix}${formatted}${suffix}`;

    if (style.toleranceEnabled && (style.toleranceUpper !== undefined || style.toleranceLower !== undefined)) {
      const u = style.toleranceUpper ?? 0;
      const l = style.toleranceLower ?? 0;
      const signU = u >= 0 ? `+${u}` : `${u}`;
      const signL = l >= 0 ? `+${l}` : `${l}`;
      result += ` [${signU}/${signL}]`;
    }

    return result;
  }
}
