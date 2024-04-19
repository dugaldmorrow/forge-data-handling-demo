
// This is a basic utility to make the log output more readable by indenting log messages based on the current context.

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
