import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const result = spawnSync('supabase', ['gen', 'types', 'typescript', '--local', '--schema', 'public'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  windowsHide: true,
});

if (result.error || result.status !== 0) {
  throw new Error('Could not generate types from the local Supabase database.');
}

const source = ts.createSourceFile(
  'database.generated.ts',
  result.stdout,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
);
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

function memberName(member) {
  if (!member.name) return undefined;
  if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) return member.name.text;
  return undefined;
}

function findMemberType(typeLiteral, name) {
  const member = typeLiteral.members.find((candidate) => memberName(candidate) === name);
  if (!member || !member.type) {
    throw new Error(`Generated database types are missing the ${name} section.`);
  }
  return member.type;
}

function findTypeMember(typeLiteral, name) {
  const type = findMemberType(typeLiteral, name);
  if (!ts.isTypeLiteralNode(type)) {
    throw new Error(`Generated database type section ${name} is not an object.`);
  }
  return type;
}

const databaseDeclaration = source.statements.find(
  (statement) => ts.isTypeAliasDeclaration(statement) && statement.name.text === 'Database',
);
if (!databaseDeclaration || !ts.isTypeLiteralNode(databaseDeclaration.type)) {
  throw new Error('The generated Database type could not be parsed.');
}

const publicSchema = findTypeMember(databaseDeclaration.type, 'public');
const tableSection = findTypeMember(publicSchema, 'Tables');
const viewSection = findTypeMember(publicSchema, 'Views');
const functionSection = findTypeMember(publicSchema, 'Functions');
const enumSection = findTypeMember(publicSchema, 'Enums');
const compositeSection = findMemberType(publicSchema, 'CompositeTypes');

const outputDirectory = join(process.cwd(), 'src', 'types');
const tablesDirectory = join(outputDirectory, 'database');
await mkdir(tablesDirectory, { recursive: true });

const enumReference = /Database\["public"\]\s*\[\s*['"]Enums['"]\s*\]\s*\[\s*['"]([^'"]+)['"]\s*\]/g;
function printType(node) {
  return printer
    .printNode(ts.EmitHint.Unspecified, node, source)
    .replace(enumReference, (_, enumName) => `PublicEnums[${JSON.stringify(enumName)}]`);
}

function typeAliasName(name, suffix) {
  return `${name
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')}${suffix}`;
}

const tableMembers = tableSection.members.filter(ts.isPropertySignature);
const tableGroups = [];
for (let index = 0; index < tableMembers.length; index += 5) {
  tableGroups.push(tableMembers.slice(index, index + 5));
}

const groupImports = [];
for (const [groupIndex, group] of tableGroups.entries()) {
  const moduleName = `tables-${String(groupIndex + 1).padStart(2, '0')}`;
  const tableAliases = group.map((member) => ({
    name: memberName(member),
    alias: typeAliasName(memberName(member), 'Table'),
    type: printType(member.type),
  }));

  const contents = [
    ...(tableAliases.some(({ type }) => type.includes('PublicEnums['))
      ? ["import type { PublicEnums } from '../database-enums';", '']
      : []),
    ...tableAliases.flatMap(({ alias, type }) => [`export type ${alias} = ${type};`, '']),
    `export type DatabaseTables${String(groupIndex + 1).padStart(2, '0')} = {`,
    ...tableAliases.map(({ name, alias }) => `  ${JSON.stringify(name)}: ${alias};`),
    '};',
  ].join('\n');

  await writeFile(join(tablesDirectory, `${moduleName}.ts`), `${contents}\n`, 'utf8');
  groupImports.push({ moduleName, typeName: `DatabaseTables${String(groupIndex + 1).padStart(2, '0')}` });
}

const publicEnums = `export type PublicEnums = ${printType(enumSection)};\n`;
const publicCompositeTypes = `export type PublicCompositeTypes = ${printType(compositeSection)};\n`;
await writeFile(join(outputDirectory, 'database-enums.ts'), publicEnums, 'utf8');
await writeFile(join(outputDirectory, 'database-composite-types.ts'), publicCompositeTypes, 'utf8');

function sectionModule(section, aliasName) {
  const printedType = printType(section);
  const imports = [];
  if (printedType.includes('PublicEnums[')) imports.push("import type { PublicEnums } from './database-enums';");
  if (/\bJson\b/.test(printedType)) imports.push("import type { Json } from './database-json';");
  return `${imports.length ? `${imports.join('\n')}\n\n` : ''}export type ${aliasName} = ${printedType};\n`;
}

await writeFile(join(outputDirectory, 'database-views.ts'), sectionModule(viewSection, 'PublicViews'), 'utf8');
await writeFile(join(outputDirectory, 'database-functions.ts'), sectionModule(functionSection, 'PublicFunctions'), 'utf8');
await writeFile(join(outputDirectory, 'database-json.ts'),
  'export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\n',
  'utf8',
);

const constantsDeclaration = source.statements.find(
  (statement) =>
    ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.some((declaration) =>
      ts.isIdentifier(declaration.name) && declaration.name.text === 'Constants',
    ),
);

const rootImports = [
  ...groupImports.map(({ moduleName, typeName }) => `import type { ${typeName} } from './database/${moduleName}';`),
  "import type { PublicCompositeTypes } from './database-composite-types';",
  "import type { PublicEnums } from './database-enums';",
  "import type { PublicFunctions } from './database-functions';",
  "import type { PublicViews } from './database-views';",
  "export type { Json } from './database-json';",
  ...(constantsDeclaration ? ["export { Constants } from './database-constants';"] : []),
];

const tablesIntersection = groupImports.map(({ typeName }) => typeName).join(' & ') || '{}';
const rootType = [
  ...rootImports,
  '',
  'export type Database = {',
  '  public: {',
  `    Tables: ${tablesIntersection};`,
  '    Views: PublicViews;',
  '    Functions: PublicFunctions;',
  '    Enums: PublicEnums;',
  '    CompositeTypes: PublicCompositeTypes;',
  '  };',
  '};',
  '',
  "type PublicSchema = Database['public'];",
  'export type Tables<Name extends keyof PublicSchema["Tables"]> =',
  '  PublicSchema["Tables"][Name] extends { Row: infer Row } ? Row : never;',
  'export type TablesInsert<Name extends keyof PublicSchema["Tables"]> =',
  '  PublicSchema["Tables"][Name] extends { Insert: infer Insert } ? Insert : never;',
  'export type TablesUpdate<Name extends keyof PublicSchema["Tables"]> =',
  '  PublicSchema["Tables"][Name] extends { Update: infer Update } ? Update : never;',
  'export type Enums<Name extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][Name];',
  'export type CompositeTypes<Name extends keyof PublicSchema["CompositeTypes"]> =',
  '  PublicSchema["CompositeTypes"][Name];',
  '',
].join('\n');
await writeFile(join(outputDirectory, 'database.ts'), rootType, 'utf8');

if (constantsDeclaration) {
  const constants = printer.printNode(ts.EmitHint.Unspecified, constantsDeclaration, source);
  await writeFile(join(outputDirectory, 'database-constants.ts'), `${constants}\n`, 'utf8');
}

const generatedFiles = [
  join(outputDirectory, 'database.ts'),
  join(outputDirectory, 'database-json.ts'),
  join(outputDirectory, 'database-enums.ts'),
  join(outputDirectory, 'database-composite-types.ts'),
  join(outputDirectory, 'database-views.ts'),
  join(outputDirectory, 'database-functions.ts'),
  ...groupImports.map(({ moduleName }) => join(tablesDirectory, `${moduleName}.ts`)),
  ...(constantsDeclaration ? [join(outputDirectory, 'database-constants.ts')] : []),
];

for (const file of generatedFiles) {
  const contents = await (await import('node:fs/promises')).readFile(file, 'utf8');
  if (contents.split(/\r?\n/).length > 500) {
    throw new Error(`Generated type file exceeds the 500-line limit: ${file}`);
  }
}

console.info(`Generated Supabase types across ${generatedFiles.length} files in src/types.`);
