/**
 * Converts a number to Indian-English words (Rupees + Paise).
 * Used in the invoice footer: "Twenty Thousand Rupees Only."
 */

const ones = ['', 'One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
               'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen',
               'Seventeen','Eighteen','Nineteen'];
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

const numToWords = (n) => {
  if (n === 0) return 'Zero';
  if (n < 20)  return ones[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  if (n < 1000)
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');

  // Indian numbering: lakh, crore
  if (n < 100000)
    return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
  if (n < 10000000)
    return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');

  return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
};

/**
 * @param {number} amount  - e.g. 20000.50
 * @returns {string}       - e.g. "Twenty Thousand Rupees and Fifty Paise Only."
 */
export const amountInWords = (amount) => {
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);
  let words = numToWords(rupees) + ' Rupee' + (rupees !== 1 ? 's' : '');
  if (paise > 0) words += ' and ' + numToWords(paise) + ' Paise';
  return words + ' Only.';
};
