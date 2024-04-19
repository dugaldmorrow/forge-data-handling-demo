
const logContext = {
  indentLevel: 0
}

export const log = (message: string) => {
  let indentPrefix = '';
  for (let i = 0; i < logContext.indentLevel; i++) {
    indentPrefix += '  ';
  }
  console.log(`${indentPrefix}${message}`);
}

export const pushLogContext = (contextName: string) => {
  logContext.indentLevel++;
  log(`Entering ${contextName}`);
}

export const popLogContext = () => {
  logContext.indentLevel--;
}
