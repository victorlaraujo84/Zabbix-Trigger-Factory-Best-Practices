import { Operator } from '../types';

export interface EvaluationResult {
  isTriggered: boolean;
  leftHandValue: number | string;
  operator: Operator;
  rightHandValue: number | string;
  explanation: string;
}

export function evaluateZabbixCondition(
  simulatedValue: number | string,
  operator: Operator,
  thresholdValue: number | string
): EvaluationResult {
  const numVal = typeof simulatedValue === 'number' ? simulatedValue : parseFloat(simulatedValue);
  const numThresh = typeof thresholdValue === 'number' ? thresholdValue : parseFloat(thresholdValue);

  let isTriggered = false;

  if (!isNaN(numVal) && !isNaN(numThresh)) {
    switch (operator) {
      case '>':
        isTriggered = numVal > numThresh;
        break;
      case '>=':
        isTriggered = numVal >= numThresh;
        break;
      case '<':
        isTriggered = numVal < numThresh;
        break;
      case '<=':
        isTriggered = numVal <= numThresh;
        break;
      case '=':
        isTriggered = numVal === numThresh;
        break;
      case '<>':
        isTriggered = numVal !== numThresh;
        break;
      default:
        isTriggered = false;
    }
  } else {
    // String comparison
    const strVal = String(simulatedValue).replace(/^["']|["']$/g, '').trim().toLowerCase();
    const strThresh = String(thresholdValue).replace(/^["']|["']$/g, '').trim().toLowerCase();
    if (operator === '=') {
      isTriggered = strVal === strThresh;
    } else if (operator === '<>') {
      isTriggered = strVal !== strThresh;
    }
  }

  const explanation = isTriggered
    ? `Condição VERDADEIRA (${simulatedValue} ${operator} ${thresholdValue}): O Zabbix gerará um PROBLEMA.`
    : `Condição FALSA (${simulatedValue} ${operator} ${thresholdValue}): O estado permanece OK (ou recupera).`;

  return {
    isTriggered,
    leftHandValue: simulatedValue,
    operator,
    rightHandValue: thresholdValue,
    explanation,
  };
}
