export const formatBaht = (value: number) => new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
export const formatThaiDate = (value: string) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
