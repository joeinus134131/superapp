import { shareTextFile } from './shareTextFile';
export const exportFinanceReport = (csv: string, filename: string) => shareTextFile(csv, filename);
