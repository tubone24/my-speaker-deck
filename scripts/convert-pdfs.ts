import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import os from 'os'; // CPUコア数取得用
import crypto from 'crypto';

// Types
interface SlideInfo {
    id: string;          // URL安全な識別子
    originalId: string;  // 元のファイル名
    title: string;
    description?: string;
    pageCount: number;
    date: string;
    location?: {
        text: string;
        url: string;
    } | null;
    thumbnail: string;
    pdfPath: string;
    thumbnails: string[];
}

interface ThumbSize {
    width: number;
    height: number;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// distディレクトリを考慮して、2階層上に戻る
const rootDir = path.resolve(__dirname, '../..');

// 設定
const PDF_DIR = path.join(rootDir, 'public/pdfs');
const IMAGE_DIR = path.join(rootDir, 'public/images/slides');
const DATA_DIR = path.join(rootDir, 'src/data');
const THUMB_SIZE: ThumbSize = { width: 300, height: 200 };
const IMAGE_FORMAT = 'jpg';
const IMAGE_QUALITY = 90;
const DPI = 200;

// 並列処理の最大数（CPUコア数に基づいて設定）
const MAX_CONCURRENT_PDFS = Math.max(1, os.cpus().length - 1);

// スライド情報を保存するリスト
const slidesData: SlideInfo[] = [];

// ファイル名をURL安全なIDに変換する関数
function generateSafeId(filename: string): string {
    // 方法1: シンプルなスラッグ化
    const slug = filename
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')  // 英数字、スペース、ハイフン以外を削除
        .replace(/[\s_-]+/g, '-')  // スペースとアンダースコアをハイフンに変換
        .replace(/^-+|-+$/g, '');  // 先頭と末尾のハイフンを削除

    // スラッグが短すぎる場合は、ハッシュを追加
    if (slug.length < 3) {
        const hash = crypto.createHash('md5').update(filename).digest('hex').substring(0, 6);
        return `slide-${hash}`;
    }

    return slug;
}

// ディレクトリを作成する関数
function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// 並列処理を制限する関数
async function limitConcurrency<T>(tasks: (() => Promise<T>)[], maxConcurrency: number): Promise<T[]> {
    const results: T[] = [];
    const running = new Set<Promise<void>>();

    for (const task of tasks) {
        if (running.size >= maxConcurrency) {
            // 実行中のタスクが上限に達したら、いずれかが完了するまで待つ
            await Promise.race([...running]);
        }

        // 新しいタスクを開始
        const promise = (async () => {
            try {
                results.push(await task());
            } finally {
                running.delete(promise);
            }
        })();

        running.add(promise);
    }

    // すべての実行中のタスクが完了するのを待つ
    await Promise.all(running);

    return results;
}

async function loadMetadataFromJson(pdfPath: string): Promise<Record<string, any>> {
    const jsonPath = pdfPath.replace(/\.pdf$/i, '.json');

    if (fs.existsSync(jsonPath)) {
        try {
            const jsonContent = fs.readFileSync(jsonPath, 'utf8');
            return JSON.parse(jsonContent);
        } catch (e) {
            console.warn(`JSONメタデータの読み込みに失敗しました: ${jsonPath}`, e);
        }
    }

    return {}; // メタデータがない場合は空オブジェクトを返す
}

// PDFをPNGに変換する関数（popplerが必要）
async function convertPdfToImages(pdfPath: string, outputDir: string, slideId: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const command = `pdftoppm -png -r ${DPI} "${pdfPath}" "${outputDir}/${slideId}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`PDFの変換に失敗しました: ${error.message}`);
                reject(error);
                return;
            }
            if (stderr) {
                console.error(`PDFの変換中にエラーが発生: ${stderr}`);
            }
            resolve();
        });
    });
}

// 画像を最適化する関数
async function optimizeImage(inputPath: string, outputPath: string, options: Record<string, any> = {}): Promise<void> {
    await sharp(inputPath)
        .jpeg({ quality: IMAGE_QUALITY })
        .toFile(outputPath);
}

// サムネイルを作成する関数
async function createThumbnail(inputPath: string, outputPath: string): Promise<void> {
    await sharp(inputPath)
        .resize(THUMB_SIZE.width, THUMB_SIZE.height, { fit: 'contain', background: { r: 240, g: 240, b: 240 } })
        .jpeg({ quality: IMAGE_QUALITY })
        .toFile(outputPath);
}

// 単一のPDFを処理する関数
async function processPdf(pdfFile: string): Promise<SlideInfo> {
    const filename = path.basename(pdfFile);
    const originalId = path.basename(filename, '.pdf');
    // URL安全なIDを生成
    const slideId = generateSafeId(originalId);
    const slideDir = path.join(IMAGE_DIR, slideId);

    // スライド用のディレクトリを作成
    ensureDir(slideDir);

    console.log(`Converting ${filename} to images...`);

    // PDFのメタデータを取得
    const pdfBytes = fs.readFileSync(pdfFile);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();

    // PDFを画像に変換
    await convertPdfToImages(pdfFile, slideDir, slideId);

    // 生成されたPNG画像を最適化してJPGに変換
    const pngFiles = fs.readdirSync(slideDir)
        .filter(file => file.toLowerCase().endsWith('.png'))
        .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''));
            const numB = parseInt(b.replace(/\D/g, ''));
            return numA - numB;
        });

    // サムネイルパスの配列を準備
    const thumbnails: string[] = [];

    // 各ページをJPGに変換（こちらも並列処理）
    const pageProcessingTasks = pngFiles.map((pngFile, i) => async () => {
        const pageNum = i + 1;
        const pngPath = path.join(slideDir, pngFile);
        const jpgPath = path.join(slideDir, `${pageNum}.jpg`);

        await optimizeImage(pngPath, jpgPath);

        // 各ページのサムネイルを作成
        const thumbPath = path.join(slideDir, `thumb-${pageNum}.jpg`);
        await createThumbnail(pngPath, thumbPath);

        // サムネイルのパスを追加
        const thumbUrl = `/images/slides/${slideId}/thumb-${pageNum}.jpg`;

        // 不要なPNGファイルを削除
        fs.unlinkSync(pngPath);

        return { pageNum, thumbUrl };
    });

    // ページ処理を並列実行（最大8ページ同時処理）
    const pageResults = await limitConcurrency(pageProcessingTasks, 8);

    // 結果をページ番号順にソート
    pageResults.sort((a, b) => a.pageNum - b.pageNum);

    // サムネイルパスを順番に追加
    thumbnails.push(...pageResults.map(result => result.thumbUrl));

    // メインのサムネイルも作成（最初のページから）
    if (pngFiles.length > 0) {
        const firstJpgPath = path.join(slideDir, '1.jpg');
        const thumbPath = path.join(slideDir, 'thumb.jpg');
        await createThumbnail(firstJpgPath, thumbPath);
    }

    // メタデータを読み込み
    const metadata = await loadMetadataFromJson(pdfFile);
    const stats = fs.statSync(pdfFile);

    // スライド情報を返す（URL安全なIDを使用）
    return {
        id: slideId,
        originalId: originalId,
        title: metadata.title || originalId.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: metadata.description || "",
        date: metadata.date ? new Date(metadata.date).toISOString() : stats.mtime.toISOString(),
        location: metadata.location || null,
        thumbnail: `/images/slides/${slideId}/thumb.jpg`,
        pageCount: pageCount,
        pdfPath: `/pdfs/${filename}`,
        thumbnails: thumbnails
    };
}

// メイン処理
async function main(): Promise<void> {
    console.log(`並列処理を開始します（最大${MAX_CONCURRENT_PDFS}つのPDFを同時処理）`);

    // ディレクトリが存在しない場合は作成
    ensureDir(IMAGE_DIR);
    ensureDir(PDF_DIR);
    ensureDir(DATA_DIR);

    // PDFファイルのリストを取得
    const pdfFiles = fs.readdirSync(PDF_DIR)
        .filter(file => file.toLowerCase().endsWith('.pdf'))
        .map(file => path.join(PDF_DIR, file));

    if (pdfFiles.length === 0) {
        console.log('変換するPDFファイルが見つかりませんでした。');
        return;
    }

    // 各PDFの処理タスクを作成
    const tasks = pdfFiles.map(pdfFile => () => processPdf(pdfFile));

    // 開始時間を記録
    const startTime = Date.now();

    // 並列処理を制限して実行
    const results = await limitConcurrency(tasks, MAX_CONCURRENT_PDFS);

    // 結果をスライドデータに追加
    slidesData.push(...results);

    // スライド情報をJSONファイルに書き出し
    fs.writeFileSync(path.join(DATA_DIR, 'slides.json'), JSON.stringify(slidesData, null, 2));

    // 処理時間を計算
    const elapsedTime = (Date.now() - startTime) / 1000;
    console.log(`Converted ${slidesData.length} PDFs to images successfully in ${elapsedTime.toFixed(2)} seconds!`);
}

// エラーハンドリング
main().catch(error => {
    console.error('処理中にエラーが発生しました:', error);
    process.exit(1);
});
