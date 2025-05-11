import path from 'path';
import ytdl from '@distube/ytdl-core';
import { getFormatDuration, getFormats } from './helper';
import express, { Request, RequestHandler, Response } from 'express';
import { QualityType, QualityTypeLabel } from './enum/quality-type.enum';

import 'dotenv/config';

const app = express();
const port = process.env.PORT || 3018;

// Middleware para processar dados do formulário
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, '../dist/public')));

// Definindo o diretório de views e o motor de templates (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Armazenar o progresso do download
const downloadProgress = new Map();

// Rota principal
app.get('/', async (req: Request, res: Response) => {
    const { url, error } = req.query;

    if (!url) {
        return res.render('index', {
            error: error || null,
            title: null,
            author: null,
            isPrivate: null,
            thumbnail: null,
            relatedVideos: null,
            publishDate: null,
            availableFormats: null,
            lengthSeconds: null,
            formattedDuration: null,
            getFormatDuration,
            QualityType,
            QualityTypeLabel
        });
    }

    if (!ytdl.validateURL(url as string)) {
        return res.render('index', {
            error: 'URL inválida do YouTube',
            title: null,
            author: null,
            isPrivate: null,
            thumbnail: null,
            relatedVideos: null,
            publishDate: null,
            availableFormats: null,
            lengthSeconds: null,
            formattedDuration: null,
            getFormatDuration,
            QualityType,
            QualityTypeLabel
        });
    }

    try {
        console.log('Passa aqui 1')
        const getInfos = await ytdl.getInfo(url as string);
        const { title, author, isPrivate, thumbnails, publishDate, lengthSeconds } = getInfos.videoDetails;
        const thumbnail = thumbnails[thumbnails.length - 1].url;
        const relatedVideos = getInfos.related_videos;
        const formattedDuration = getFormatDuration(parseInt(lengthSeconds));
        const availableFormats = getFormats(getInfos);

        res.render('index', {
            error: null,
            title,
            author,
            isPrivate,
            thumbnail,
            relatedVideos,
            publishDate,
            availableFormats,
            lengthSeconds,
            formattedDuration,
            getFormatDuration,
            QualityType,
            QualityTypeLabel
        });
    } catch (error) {
        console.error('Erro:', error);
        res.render('index', {
            error: 'Ocorreu um erro ao buscar as informações do vídeo. Por favor, tente novamente.',
            title: null,
            author: null,
            isPrivate: null,
            thumbnail: null,
            relatedVideos: null,
            publishDate: null,
            availableFormats: null,
            lengthSeconds: null,
            formattedDuration: null,
            getFormatDuration,
            QualityType,
            QualityTypeLabel
        });
    }
});

app.post('/video-info', (async (req, res) => {
    const { url, format } = req.body;

    if (!url) {
        return res.json({
            error: 'Por favor, insira uma URL do YouTube'
        });
    }

    if (!ytdl.validateURL(url)) {
        return res.json({
            error: 'URL inválida do YouTube'
        });
    }

    try {
        const getInfos = await ytdl.getInfo(url);
        const { title, author, isPrivate, thumbnails, publishDate, lengthSeconds } = getInfos.videoDetails;
        const thumbnail = thumbnails[thumbnails.length - 1].url;
        const relatedVideos = getInfos.related_videos;
        const formattedDuration = getFormatDuration(parseInt(lengthSeconds));

        const availableFormats = getFormats(getInfos);

        res.json({
            error: null,
            title,
            author,
            isPrivate,
            thumbnail,
            relatedVideos,
            publishDate,
            availableFormats,
            lengthSeconds,
            formattedDuration,
            getFormatDuration,
            QualityType,
            QualityTypeLabel
        });
    } catch (error) {
        console.error('Erro:', error);
        res.json({
            error: 'Ocorreu um erro ao fazer o download. Por favor, tente novamente.'
        });
    }
}) as RequestHandler);

// Rota para receber atualizações de progresso via SSE
app.get('/download-progress/:id', (req, res) => {
    const downloadId = req.params.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Enviar eventos de progresso
    const progressInterval = setInterval(() => {
        const progress = downloadProgress.get(downloadId);
        if (progress) {
            res.write(`data: ${JSON.stringify(progress)}\n\n`);
            if (progress.status === 'completed' || progress.status === 'error') {
                downloadProgress.delete(downloadId);
                clearInterval(progressInterval);
                res.end();
            }
        }
    }, 100);

    // Limpar quando a conexão for fechada
    req.on('close', () => {
        clearInterval(progressInterval);
        downloadProgress.delete(downloadId);
    });
});

// Rota para download
app.post('/download', (async (req, res) => {
    try {
        console.log('1. Iniciando download...');
        const { url, format } = req.body;
        const selectedFormat = typeof format === 'string' ? JSON.parse(format) : format;
        console.log('2. Formato selecionado:', selectedFormat.qualityLabel);

        // Gerar ID único para este download
        const downloadId = Date.now().toString();
        downloadProgress.set(downloadId, { status: 'starting', progress: 0 });

        if (!url) {
            console.log('Erro: URL não fornecida');
            downloadProgress.set(downloadId, { status: 'error', error: 'URL não fornecida' });
            return res.status(400).json({
                error: 'Por favor, insira uma URL do YouTube',
                downloadId
            });
        }

        if (!ytdl.validateURL(url)) {
            console.log('Erro: URL inválida');
            downloadProgress.set(downloadId, { status: 'error', error: 'URL inválida' });
            return res.status(400).json({
                error: 'URL inválida do YouTube',
                downloadId
            });
        }

        console.log('3. Obtendo informações do vídeo...');
        const info = await ytdl.getInfo(url);
        const { title } = info.videoDetails;
        console.log('4. Título do vídeo:', title);

        // Configurar os headers antes de iniciar o stream
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.mp4"`);
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('X-Download-Id', downloadId);

        console.log('5. Iniciando stream do vídeo...');
        const stream = ytdl(url, {
            format: selectedFormat,
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }
        });

        let downloadedBytes = 0;
        const totalBytes = parseInt(selectedFormat.contentLength);

        stream.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            const progress = totalBytes ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
            downloadProgress.set(downloadId, { 
                status: 'downloading',
                progress,
                downloadedBytes,
                totalBytes
            });
        });

        stream.on('info', (info, format) => {
            console.log('6. Stream info recebida');
            downloadProgress.set(downloadId, { 
                status: 'started',
                progress: 0,
                title: info.videoDetails.title
            });
        });

        stream.on('error', (error) => {
            console.error('Erro no stream:', error);
            downloadProgress.set(downloadId, { 
                status: 'error',
                error: 'Erro ao processar o vídeo'
            });
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Erro ao processar o vídeo. Por favor, tente novamente.',
                    downloadId
                });
            }
        });

        stream.on('end', () => {
            console.log('8. Download concluído');
            downloadProgress.set(downloadId, { 
                status: 'completed',
                progress: 100
            });
        });

        // Pipe o stream para a resposta
        stream.pipe(res);

    } catch (error) {
        console.error('Erro geral:', error);
        const downloadId = Date.now().toString();
        downloadProgress.set(downloadId, { 
            status: 'error',
            error: 'Erro ao processar o vídeo'
        });
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Ocorreu um erro ao fazer o download. Por favor, tente novamente.',
                downloadId
            });
        }
    }
}) as RequestHandler);

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
