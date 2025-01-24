import { importAlipayCSV } from '../src/lib/importers/alipay';

async function main() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Please provide the CSV file path');
        process.exit(1);
    }

    try {
        await importAlipayCSV(filePath);
    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
}

main(); 