/**
 * Утилиты для форматирования данных
 */

/**
 * Безопасно форматирует число с разделителями тысяч
 * @param value - число для форматирования
 * @param locale - локаль для форматирования (по умолчанию 'ru-RU')
 * @returns отформатированная строка или '0' если значение undefined/null
 */
export const formatNumber = (value: number | null | undefined, locale: string = 'ru-RU'): string => {
  const numValue = value || 0;
  return numValue.toLocaleString(locale);
};

/**
 * Безопасно форматирует валюту
 * @param value - сумма для форматирования
 * @param currency - валюта (по умолчанию 'сум')
 * @param locale - локаль для форматирования (по умолчанию 'ru-RU')
 * @returns отформатированная строка с валютой
 */
export const formatCurrency = (
  value: number | null | undefined, 
  currency: string = 'сум', 
  locale: string = 'ru-RU'
): string => {
  const numValue = value || 0;
  return `${numValue.toLocaleString(locale)} ${currency}`;
};

/**
 * Безопасно форматирует дату
 * @param date - дата для форматирования
 * @param options - опции форматирования
 * @returns отформатированная строка даты
 */
export const formatDate = (
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('ru-RU', options);
  } catch (error) {
    console.error('Ошибка форматирования даты:', error);
    return '';
  }
};

/**
 * Безопасно форматирует время
 * @param date - дата для форматирования времени
 * @param options - опции форматирования времени
 * @returns отформатированная строка времени
 */
export const formatTime = (
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleTimeString('ru-RU', options);
  } catch (error) {
    console.error('Ошибка форматирования времени:', error);
    return '';
  }
};
