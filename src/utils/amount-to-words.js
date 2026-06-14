/**
 * Convert a number to Indian number system words.
 * Example: 25450 → "Twenty-Five Thousand Four Hundred Fifty Only"
 * Supports numbers up to 999999999 (99 Crore 99 Lakh...).
 */

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/**
 * Convert a number below 1000 to words.
 */
function _convertHundreds(n) {
  let result = '';
  const hundreds = Math.floor(n / 100);
  if (hundreds > 0) {
    result += `${ONES[hundreds]} Hundred `;
    n %= 100;
  }
  if (n > 0 && n < 20) {
    result += `${ONES[n]} `;
  } else if (n >= 20) {
    const tens = Math.floor(n / 10);
    result += `${TENS[tens]} `;
    const ones = n % 10;
    if (ones > 0) {
      result += `${ONES[ones]} `;
    }
  }
  return result;
}

/**
 * Convert an integer to Indian-system words.
 * Indian system: ... Crore (10^7), Lakh (10^5), Thousand (10^3), Hundred (10^2)
 *
 * @param {number} amount - The integer amount to convert.
 * @returns {string} Words representation, e.g. "Twenty-Five Thousand Four Hundred Fifty"
 */
function amountToWords(amount) {
  if (amount === 0) return 'Zero';
  if (amount < 0) return `Minus ${amountToWords(Math.abs(amount))}`;

  let result = '';
  let n = Math.floor(Math.abs(amount));

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) {
    result += `${_convertHundreds(crore)}Crore `;
  }

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) {
    result += `${_convertHundreds(lakh)}Lakh `;
  }

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) {
    result += `${_convertHundreds(thousand)}Thousand `;
  }

  if (n > 0) {
    result += _convertHundreds(n);
  }

  return result.trim();
}

/**
 * Convert a decimal salary amount to Indian-system words with "Only" suffix.
 *
 * @param {number} amount - The amount to convert (supports decimals — fractional part ignored for words).
 * @returns {string} e.g. "Twenty-Five Thousand Four Hundred Fifty Only"
 */
function salaryToWords(amount) {
  const integerPart = Math.floor(Math.abs(amount));
  return `${amountToWords(integerPart)} Only`.replace(/\s+/g, ' ').trim();
}

module.exports = { amountToWords, salaryToWords };