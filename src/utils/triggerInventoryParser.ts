import * as XLSX from 'xlsx';

export interface RawTriggerRecord {
  id: string;
  host: string;
  name: string;
  expression: string;
  sourceRowNumber?: number;
}

export interface InventoryParseResult {
  success: boolean;
  records: RawTriggerRecord[];
  totalParsed: number;
  warnings: string[];
  detectedFormat: 'csv' | 'tsv' | 'json' | 'xml' | 'manual' | 'excel';
  fileName?: string;
}

/**
 * Excel Parser for 3-Column Trigger Inventories (.xlsx / .xls):
 * Host > Nome > Expressão
 */
export function parseTriggerInventoryExcel(
  buffer: ArrayBuffer,
  fileName?: string
): InventoryParseResult {
  const warnings: string[] = [];

  try {
    // 1. Read workbook safely using Uint8Array
    const uint8 = new Uint8Array(buffer);
    const workbook = XLSX.read(uint8, { type: 'array', cellDates: true, raw: false });
    const sheetNames = workbook.SheetNames;

    if (!sheetNames || sheetNames.length === 0) {
      return {
        success: false,
        records: [],
        totalParsed: 0,
        warnings: ['O arquivo Excel não contém nenhuma planilha.'],
        detectedFormat: 'excel',
        fileName,
      };
    }

    // 2. Find the first worksheet that actually has data
    let targetSheet: XLSX.WorkSheet | null = null;
    let targetSheetName = '';
    let rawRows: any[][] = [];

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '', raw: false });
      const nonEmpty = rows.filter(
        (r) => Array.isArray(r) && r.some((c) => c !== null && c !== undefined && String(c).trim() !== '')
      );

      if (nonEmpty.length > 0) {
        targetSheet = sheet;
        targetSheetName = sheetName;
        rawRows = rows;
        break;
      }
    }

    if (!targetSheet || rawRows.length === 0) {
      return {
        success: false,
        records: [],
        totalParsed: 0,
        warnings: ['A planilha Excel está vazia.'],
        detectedFormat: 'excel',
        fileName,
      };
    }

    // 3. Filter completely empty rows
    const nonEmptyRows = rawRows.filter(
      (r) => Array.isArray(r) && r.some((c) => c !== null && c !== undefined && String(c).trim() !== '')
    );

    // 4. Robust Header Detection across the first 10 rows
    let headerRowIdx = -1;
    let hostIdx = 0;
    let nameIdx = 1;
    let exprIdx = 2;

    for (let r = 0; r < Math.min(10, nonEmptyRows.length); r++) {
      const rowCols = (nonEmptyRows[r] || []).map((c: any) => String(c).toLowerCase().trim());

      const foundHost = rowCols.findIndex(
        (c: string) =>
          c === 'host' ||
          c === 'ativo' ||
          c === 'servidor' ||
          c === 'equipamento' ||
          c.startsWith('host') ||
          c.includes('hostname')
      );

      const foundName = rowCols.findIndex(
        (c: string) =>
          c === 'nome' ||
          c === 'name' ||
          c === 'trigger' ||
          c === 'alarme' ||
          c.includes('trigger') ||
          c.includes('nome da trigger') ||
          c === 'descricao'
      );

      const foundExpr = rowCols.findIndex(
        (c: string) =>
          c === 'expressao' ||
          c === 'expressão' ||
          c === 'expression' ||
          c === 'expr' ||
          c.includes('express') ||
          c.includes('condicao') ||
          c.includes('regra')
      );

      const validMatches = [foundHost, foundName, foundExpr].filter((idx) => idx !== -1);
      const uniqueMatches = new Set(validMatches);

      if (uniqueMatches.size >= 2) {
        headerRowIdx = r;
        if (foundHost !== -1) hostIdx = foundHost;
        if (foundName !== -1) nameIdx = foundName;
        if (foundExpr !== -1) exprIdx = foundExpr;
        break;
      }
    }

    const startIndex = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;
    const records: RawTriggerRecord[] = [];

    for (let i = startIndex; i < nonEmptyRows.length; i++) {
      const row = nonEmptyRows[i];
      if (!Array.isArray(row)) continue;

      let host = String(row[hostIdx] ?? (row[0] ?? '')).trim();
      let name = String(row[nameIdx] ?? (row[1] ?? '')).trim();
      let expression = String(row[exprIdx] ?? (row[2] ?? '')).trim();

      // Clean Excel formula artifact (e.g. '=nodata(...)' -> 'nodata(...)')
      if (expression.startsWith('=') && /^[=][a-zA-Z_{]/.test(expression)) {
        expression = expression.slice(1).trim();
      }

      // If expression is empty but row has other columns, search for expression-like string
      if (!expression) {
        for (let c = 0; c < row.length; c++) {
          if (c !== hostIdx && c !== nameIdx) {
            const val = String(row[c] ?? '').trim();
            if (val.includes('(') || val.includes('{') || val.includes('>')) {
              expression = val;
              break;
            }
          }
        }
      }

      if (!expression && !name) continue;

      records.push({
        id: `trig-xlsx-${i}-${Date.now()}`,
        host: host || 'Host Não Especificado',
        name: name || 'Trigger Sem Nome',
        expression: expression || name,
        sourceRowNumber: i + 1,
      });
    }

    return {
      success: records.length > 0,
      records,
      totalParsed: records.length,
      warnings,
      detectedFormat: 'excel',
      fileName,
    };
  } catch (err: any) {
    return {
      success: false,
      records: [],
      totalParsed: 0,
      warnings: [`Falha ao ler planilha Excel: ${err?.message || 'Arquivo corrompido ou formato não suportado'}`],
      detectedFormat: 'excel',
      fileName,
    };
  }
}

/**
 * Universal Parser for 3-Column Trigger Inventories:
 * Host > Nome > Expressão (CSV, JSON, XML, TSV)
 */
export function parseTriggerInventoryText(
  rawText: string,
  fileName?: string
): InventoryParseResult {
  const warnings: string[] = [];
  const text = rawText.trim();

  if (!text) {
    return {
      success: false,
      records: [],
      totalParsed: 0,
      warnings: ['O arquivo ou conteúdo fornecido está vazio.'],
      detectedFormat: 'manual',
      fileName,
    };
  }

  // 1. Try parsing as JSON
  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      const parsedJson = JSON.parse(text);
      const records = parseJsonInventory(parsedJson, warnings);
      if (records.length > 0) {
        return {
          success: true,
          records,
          totalParsed: records.length,
          warnings,
          detectedFormat: 'json',
          fileName,
        };
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  // 2. Try parsing as XML
  if (text.startsWith('<') && (text.includes('<?xml') || text.includes('<zabbix_export') || text.includes('<triggers>'))) {
    try {
      const records = parseXmlInventory(text, warnings);
      if (records.length > 0) {
        return {
          success: true,
          records,
          totalParsed: records.length,
          warnings,
          detectedFormat: 'xml',
          fileName,
        };
      }
    } catch {
      // Continue to CSV parsing
    }
  }

  // 3. Parse as CSV / TSV
  return parseDelimitedInventory(text, fileName, warnings);
}

/**
 * Detect delimiter: comma, semicolon, or tab
 */
function detectDelimiter(firstFewLines: string[]): string {
  let semicolonCount = 0;
  let commaCount = 0;
  let tabCount = 0;

  for (const line of firstFewLines) {
    semicolonCount += (line.match(/;/g) || []).length;
    commaCount += (line.match(/,/g) || []).length;
    tabCount += (line.match(/\t/g) || []).length;
  }

  if (tabCount > semicolonCount && tabCount > commaCount) return '\t';
  if (semicolonCount >= commaCount) return ';';
  return ',';
}

/**
 * Split a delimited line respecting quoted strings
 */
function splitDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char;
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseDelimitedInventory(
  text: string,
  fileName: string | undefined,
  warnings: string[]
): InventoryParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      records: [],
      totalParsed: 0,
      warnings: ['Nenhuma linha de dados identificada no arquivo.'],
      detectedFormat: 'csv',
      fileName,
    };
  }

  const sampleLines = lines.slice(0, Math.min(5, lines.length));
  const delimiter = detectDelimiter(sampleLines);

  let startIndex = 0;
  let hostIdx = 0;
  let nameIdx = 1;
  let exprIdx = 2;

  // Header detection across first line
  const firstRowCols = splitDelimitedLine(lines[0], delimiter).map((c) =>
    c.toLowerCase().replace(/["']/g, '').trim()
  );

  const foundHost = firstRowCols.findIndex(
    (c) => c === 'host' || c === 'ativo' || c === 'servidor' || c === 'equipamento' || c.startsWith('host')
  );
  const foundName = firstRowCols.findIndex(
    (c) => c === 'nome' || c === 'name' || c === 'trigger' || c === 'alarme' || c.includes('trigger') || c.includes('nome')
  );
  const foundExpr = firstRowCols.findIndex(
    (c) => c === 'expressao' || c === 'expressão' || c === 'expression' || c === 'expr' || c.includes('express')
  );

  const validMatches = [foundHost, foundName, foundExpr].filter((idx) => idx !== -1);
  const uniqueMatches = new Set(validMatches);

  if (uniqueMatches.size >= 2) {
    startIndex = 1;
    if (foundHost !== -1) hostIdx = foundHost;
    if (foundName !== -1) nameIdx = foundName;
    if (foundExpr !== -1) exprIdx = foundExpr;
  }

  const records: RawTriggerRecord[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine.startsWith('#') || rawLine.startsWith('//')) continue;

    const cols = splitDelimitedLine(rawLine, delimiter).map((c) =>
      c.replace(/^["']|["']$/g, '').trim()
    );

    if (cols.length < 2) {
      warnings.push(`Linha ${i + 1} ignorada: quantidade insuficiente de colunas.`);
      continue;
    }

    const host = cols[hostIdx] || (cols.length >= 1 ? cols[0] : '');
    const name = cols[nameIdx] || (cols.length >= 2 ? cols[1] : '');
    let expression = cols[exprIdx] || (cols.length >= 3 ? cols[2] : '');

    // Reassemble unquoted comma-separated parameters in expression if needed
    if (delimiter === ',' && exprIdx === 2 && cols.length > 3) {
      expression = cols.slice(2).join(',');
    }

    if (!expression && !name) continue;

    records.push({
      id: `trig-csv-${i}-${Date.now()}`,
      host: host || 'Host Não Especificado',
      name: name || 'Trigger Sem Nome',
      expression: expression || name,
      sourceRowNumber: i + 1,
    });
  }

  return {
    success: records.length > 0,
    records,
    totalParsed: records.length,
    warnings,
    detectedFormat: delimiter === '\t' ? 'tsv' : 'csv',
    fileName,
  };
}

function parseJsonInventory(data: any, warnings: string[]): RawTriggerRecord[] {
  const records: RawTriggerRecord[] = [];

  if (Array.isArray(data)) {
    data.forEach((item, idx) => {
      if (typeof item === 'object' && item !== null) {
        const host = item.host || item.Host || item.ativo || item.hostname || '';
        const name = item.nome || item.Nome || item.name || item.trigger || item.trigger_name || '';
        const expression = item.expressao || item.Expressao || item.expression || item.expr || '';

        if (name || expression) {
          records.push({
            id: `trig-json-${idx}`,
            host: String(host || 'Host Não Especificado'),
            name: String(name || 'Trigger Sem Nome'),
            expression: String(expression || ''),
            sourceRowNumber: idx + 1,
          });
        }
      }
    });
    return records;
  }

  if (typeof data === 'object' && data !== null) {
    const zabbixRoot = data.zabbix_export || data;

    if (Array.isArray(zabbixRoot.triggers)) {
      zabbixRoot.triggers.forEach((trig: any, idx: number) => {
        const host = trig.host || (trig.dependencies && trig.dependencies[0]?.name) || 'Zabbix Host / Template';
        records.push({
          id: `trig-zbx-${idx}`,
          host: String(host),
          name: String(trig.name || trig.description || 'Trigger Zabbix'),
          expression: String(trig.expression || ''),
          sourceRowNumber: idx + 1,
        });
      });
    }

    if (Array.isArray(zabbixRoot.templates)) {
      zabbixRoot.templates.forEach((tmpl: any) => {
        const tmplName = tmpl.template || tmpl.name || 'Template Zabbix';
        if (Array.isArray(tmpl.triggers)) {
          tmpl.triggers.forEach((trig: any, idx: number) => {
            records.push({
              id: `trig-tmpl-${idx}`,
              host: tmplName,
              name: String(trig.name || trig.description || 'Trigger Template'),
              expression: String(trig.expression || ''),
              sourceRowNumber: idx + 1,
            });
          });
        }
      });
    }

    if (Array.isArray(zabbixRoot.hosts)) {
      zabbixRoot.hosts.forEach((h: any) => {
        const hName = h.host || h.name || 'Host Zabbix';
        if (Array.isArray(h.triggers)) {
          h.triggers.forEach((trig: any, idx: number) => {
            records.push({
              id: `trig-h-${idx}`,
              host: hName,
              name: String(trig.name || trig.description || 'Trigger Host'),
              expression: String(trig.expression || ''),
              sourceRowNumber: idx + 1,
            });
          });
        }
      });
    }
  }

  if (records.length === 0) {
    warnings.push('O arquivo JSON não contém objetos no formato { host, nome, expressao } ou exportação de triggers Zabbix.');
  }

  return records;
}

function parseXmlInventory(xmlText: string, warnings: string[]): RawTriggerRecord[] {
  const records: RawTriggerRecord[] = [];
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      warnings.push('Erro na estrutura do XML fornecido.');
      return records;
    }

    const triggerNodes = xmlDoc.getElementsByTagName('trigger');
    for (let i = 0; i < triggerNodes.length; i++) {
      const node = triggerNodes[i];

      const host =
        node.getElementsByTagName('host')[0]?.textContent ||
        node.parentElement?.getElementsByTagName('host')[0]?.textContent ||
        node.parentElement?.getElementsByTagName('name')[0]?.textContent ||
        'Host Zabbix';

      const name =
        node.getElementsByTagName('nome')[0]?.textContent ||
        node.getElementsByTagName('name')[0]?.textContent ||
        node.getElementsByTagName('description')[0]?.textContent ||
        'Trigger Sem Nome';

      const expression =
        node.getElementsByTagName('expressao')[0]?.textContent ||
        node.getElementsByTagName('expression')[0]?.textContent ||
        '';

      if (expression || name) {
        records.push({
          id: `trig-xml-${i}`,
          host: host.trim(),
          name: name.trim(),
          expression: expression.trim(),
          sourceRowNumber: i + 1,
        });
      }
    }
  } catch (err: any) {
    warnings.push(`Falha no leitor de XML: ${err?.message || 'Arquivo mal formatado'}`);
  }

  return records;
}

/**
 * Demonstration Samples for 3-Column Trigger Inventories
 */
export const SAMPLE_3_COLUMN_INVENTORY = [
  {
    host: 'rj01ora_ptrhucm1_instance',
    name: 'Oracle: FALHA em coletar dados (ou sem dados por 5m)',
    expression: 'nodata(/rj01ora_ptrhucm1_instance/oracle.uptime,5m)=1',
  },
  {
    host: 'srv-app-prod01',
    name: 'Linux: Alta utilização de CPU acima de 90%',
    expression: 'last(/srv-app-prod01/system.cpu.util) > 90',
  },
  {
    host: 'srv-db-mysql01',
    name: 'MySQL: Uso de CPU Crítico Sintaxe 5.0 Legada',
    expression: '{srv-db-mysql01:system.cpu.util.last()}>95',
  },
  {
    host: 'sw-core-dc01',
    name: 'Cisco: Erros de CRC na porta GigabitEthernet1/0/1',
    expression: 'change(/sw-core-dc01/net.if.in.errors[Gi1/0/1]) > 0',
  },
  {
    host: 'fw-fortigate-perimeter',
    name: 'FortiGate: Sessões ativas de Firewall excedendo 80000',
    expression: 'last(/fw-fortigate-perimeter/fgSysSesRate) > 80000',
  },
  {
    host: 'srv-storage-san01',
    name: 'Storage: Espaço livre no volume /data abaixo de 10%',
    expression: 'last(/srv-storage-san01/vfs.fs.size[/data,pfree]) < 10',
  },
  {
    host: 'srv-win-ad01',
    name: 'Active Directory: Sem dados de replicação NTDS por 10m',
    expression: 'nodata(/srv-win-ad01/ad.replication.errors,10m)=1',
  },
  {
    host: 'link-embratel-primary',
    name: 'WAN: Perda de pacotes no link primário acima de 20%',
    expression: 'min(/link-embratel-primary/icmppingloss,3m) > 20',
  },
  {
    host: 'srv-docker-swarm01',
    name: 'Docker: Quantidade de containers parados acima de 5',
    expression: 'last(/srv-docker-swarm01/docker.containers.stopped) > 5',
  },
  {
    host: 'srv-app-prod02',
    name: 'Linux: Memória disponível baixa sem histerese',
    expression: 'last(/srv-app-prod02/vm.memory.size[available]) < 1073741824',
  },
];
