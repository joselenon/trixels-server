import Decimal from 'decimal.js';

const calcWithDecimalsService = (
  firstValue: number,
  command: 'add' | 'subtract' | 'multiply' | 'divide',
  secondValue: number,
): number => {
  const decimalFirstValue = new Decimal(firstValue);
  const decimalSecondValue = new Decimal(secondValue);

  let result;
  switch (command) {
    case 'add':
      result = decimalFirstValue.add(decimalSecondValue);
      break;
    case 'subtract':
      result = decimalFirstValue.minus(decimalSecondValue);
      break;
    case 'multiply':
      result = decimalFirstValue.times(decimalSecondValue);
      break;
    case 'divide':
      if (decimalSecondValue.isZero()) {
        throw new Error('Cannot divide by zero.');
      }
      result = decimalFirstValue.dividedBy(decimalSecondValue);
      break;
    default:
      throw new Error('Invalid command. Use "add", "subtract", "multiply", or "divide".');
  }

  return result.toNumber();
};

export default calcWithDecimalsService;
