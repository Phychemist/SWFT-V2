export const formatIST = (date: Date | string, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...options,
  }).format(new Date(date))

export const getTodayIST = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

export const formatCurrency = (amount: number): string => {
  if (amount === undefined || amount === null) return '₹0.00';
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const formatDate = (date: Date | string): string => {
  if (!date) return '-';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date))
  } catch (e) {
    return String(date);
  }
}

export const getPaginationParams = (url: URL) => ({
  page: Math.max(1, parseInt(url.searchParams.get('page') ?? '1')),
  pageSize: Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20'))),
})
