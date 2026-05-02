export function makeBookId(dirKey: string, fileName: string) {
  return `${dirKey}::${fileName}`;
}
