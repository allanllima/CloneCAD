export interface DWGHeaderInfo {
  valid: boolean;
  isValid: boolean;
  magic: string;
  versionCode: string;
  versionName: string;
  year: number;
  releaseYear: string;
  maintenanceRelease?: number;
  is3D?: boolean;
}

const DWG_VERSION_MAP: Record<string, { name: string; year: number }> = {
  'MC0.0': { name: 'AutoCAD R1.0', year: 1982 },
  'AC1.2': { name: 'AutoCAD R1.2', year: 1983 },
  'AC1.4': { name: 'AutoCAD R1.4', year: 1983 },
  'AC1.50': { name: 'AutoCAD R2.05', year: 1984 },
  'AC2.10': { name: 'AutoCAD R2.1', year: 1985 },
  'AC1002': { name: 'AutoCAD R2.5', year: 1986 },
  'AC1003': { name: 'AutoCAD R2.6', year: 1987 },
  'AC1004': { name: 'AutoCAD Release 9', year: 1987 },
  'AC1006': { name: 'AutoCAD Release 10', year: 1988 },
  'AC1009': { name: 'AutoCAD Release 11/12', year: 1990 },
  'AC1012': { name: 'AutoCAD Release 13', year: 1994 },
  'AC1014': { name: 'AutoCAD Release 14', year: 1997 },
  'AC1015': { name: 'AutoCAD 2000 / 2000i / 2002', year: 2000 },
  'AC1018': { name: 'AutoCAD 2004 / 2005 / 2006', year: 2004 },
  'AC1021': { name: 'AutoCAD 2007 / 2008 / 2009', year: 2007 },
  'AC1024': { name: 'AutoCAD 2010 / 2011 / 2012', year: 2010 },
  'AC1027': { name: 'AutoCAD 2013 / 2014 / 2015 / 2016 / 2017', year: 2013 },
  'AC1032': { name: 'AutoCAD 2018 / 2021 / 2024 / 2026', year: 2018 },
};

export class DWGHeaderReader {
  /**
   * Reads and inspects the binary header of a .DWG file
   */
  public static readHeader(buffer: ArrayBuffer | Uint8Array): DWGHeaderInfo {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    if (bytes.length < 6) {
      return {
        valid: false,
        isValid: false,
        magic: '',
        versionCode: 'UNKNOWN',
        versionName: 'Arquivo inválido (muito curto)',
        year: 0,
        releaseYear: 'Unknown',
      };
    }

    // First 6 bytes are ASCII magic characters (e.g. "AC1032" or "AC1015")
    let magic = '';
    for (let i = 0; i < 6; i++) {
      magic += String.fromCharCode(bytes[i]);
    }

    // Clean null characters or trailing whitespace
    const cleanMagic = magic.replace(/\0/g, '').trim();
    const info = DWG_VERSION_MAP[cleanMagic];

    if (!info) {
      // Check if it starts with AC
      if (cleanMagic.startsWith('AC') || cleanMagic.startsWith('MC')) {
        return {
          valid: true,
          isValid: true,
          magic: cleanMagic,
          versionCode: cleanMagic,
          versionName: `AutoCAD Formato (${cleanMagic})`,
          year: 2000,
          releaseYear: `AutoCAD (${cleanMagic})`,
        };
      }

      return {
        valid: false,
        isValid: false,
        magic: cleanMagic,
        versionCode: 'UNKNOWN',
        versionName: 'Assinatura binária DWG não reconhecida',
        year: 0,
        releaseYear: 'Unknown',
      };
    }

    let maintenanceRelease = 0;
    if (bytes.length >= 11) {
      // Byte 11 contains maintenance version in modern DWG
      maintenanceRelease = bytes[11];
    }

    return {
      valid: true,
      isValid: true,
      magic: cleanMagic,
      versionCode: cleanMagic,
      versionName: info.name,
      year: info.year,
      releaseYear: info.name,
      maintenanceRelease,
    };
  }
}
