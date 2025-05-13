import path from 'path';
import ytdl from '@distube/ytdl-core';
import { getFormatDuration, getFormats } from './helper';
import express, { Request, RequestHandler, Response } from 'express';
import { QualityType, QualityTypeLabel } from './enum/quality-type.enum';
import { Cookie } from 'undici-types';

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


// function parseCookies(cookieString: string): Cookie[] {
//     return cookieString.split(';').map(c => {
//         const [name, ...rest] = c.trim().split('=');
//         return {
//             name,
//             value: rest.join('=')
//         };
//     });
// }

// const rawCookies = process.env.YOUTUBE_COOKIES || '';
// const cookies = parseCookies(rawCookies);
// const agent = ytdl.createAgent(cookies, {
//     pipelining: 5
// });

const proxyList = [
    'http://152.26.229.66:9443',
    'http://152.26.229.88:9443',
    'http://152.26.231.42:9443',
    'http://152.26.231.77:9443',
    'http://152.26.229.88:9443',
    'http://177.234.241.27:999',
    'http://177.234.241.30:999',
    'http://177.234.241.26:999',
    'http://177.234.241.25:999'
];

// Seleciona um proxy aleatório
const randomProxy = proxyList[Math.floor(Math.random() * proxyList.length)];

const agent = ytdl.createProxyAgent({ uri: proxyList[0] });
  


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
        const getInfos = await ytdl.getInfo(url as string, 
            // { agent }
        );
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
        const getInfos = await ytdl.getInfo(url, 
            // { agent }
        );
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
        console.error('Error - 2: ', error)
        res.json({
            error: 'Ocorreu um erro ao fazer o download. Por favor, tente novamente. 2'
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

        //TODO: Verificar se o formato é um objeto ou uma string

        const selectedFormat = format// typeof format === 'string' ? JSON.parse(format) : format;

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

        const info = await ytdl.getInfo(url, 
            // { agent }
        );
        const { title } = info.videoDetails;

        console.log('4. Título do vídeo:', title);

        // Configurar os headers antes de iniciar o stream
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.mp4"`);
        res.setHeader('Transfer-Encoding', 'chunked');
        res.setHeader('X-Download-Id', downloadId);

        console.log('5. Iniciando stream do vídeo...');
        const stream = ytdl(url, {
            // agent,
            // format: {
            //     mimeType: 'video/mp4; codecs="avc1.4d401f"',
            //     qualityLabel: '720p',
            //     bitrate: 1077144,
            //     itag: 136,
            //     url: 'https://rr1---sn-8p8v-0qpe.googlevideo.com/videoplayback?expire=1747117314&ei=opAiaI2iIY-6-LAPyeqI0Ac&ip=2804%3A1b3%3A3002%3Aba5b%3A203b%3Ae65%3A36b3%3A91b9&id=o-ALg7-CqWjAi0ukYOQuLUiSliI_FNB6eBm66JLLKB9-g8&itag=136&aitags=133%2C134%2C135%2C136%2C137%2C160%2C242%2C243%2C244%2C247%2C248%2C271%2C278%2C313%2C394%2C395%2C396%2C397%2C398%2C399%2C400%2C401&source=youtube&requiressl=yes&xpc=EgVo2aDSNQ%3D%3D&met=1747095714%2C&mh=WC&mm=31%2C29&mn=sn-8p8v-0qpe%2Csn-b8u-bpbe&ms=au%2Crdu&mv=m&mvi=1&pl=41&rms=au%2Cau&initcwndbps=2591250&bui=AecWEAZq5Ua-Owkghbr-cByTA-GYoYo7pqB59cd1XAK1cvI1wXW5RLPgHFK9YuwDFAmumRrDMc_d6Uak&spc=wk1kZiAgr_WuMXVdS4gQFKQSrgE8HNo3ltFT9-U47oq276pzkIb1pLSeq_U64nnwrP_0XcA&vprv=1&svpuc=1&mime=video%2Fmp4&ns=VCrf5iRqm8RObLvktjOtnKcQ&rqh=1&gir=yes&clen=49708026&dur=476.499&lmt=1746348465191810&mt=1747095184&fvip=8&keepalive=yes&c=WEB_EMBEDDED_PLAYER&sefc=1&txp=5532534&n=9BcUo_vTlCQvYQ&sparams=expire%2Cei%2Cip%2Cid%2Caitags%2Csource%2Crequiressl%2Cxpc%2Cbui%2Cspc%2Cvprv%2Csvpuc%2Cmime%2Cns%2Crqh%2Cgir%2Cclen%2Cdur%2Clmt&sig=AJfQdSswRgIhAIzq8wh0Qo66TNK9coGZ1sLBQlxTNz9RcfFimdcbGaRTAiEAgJHKnZL0k_SdPdnfflwbLwwTeS9UWNYvzhdREMSpV5E%3D&lsparams=met%2Cmh%2Cmm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Crms%2Cinitcwndbps&lsig=ACuhMU0wRQIhANdZTeX0uRIzlKEZsNXrOr-s3-ANCZnqkc43UWnFv6VFAiBM8nOan63hkL7C5pGqr1w6jb6NxYgo3b3TtgFExPghIQ%3D%3D',
            //     width: 1280,
            //     height: 720,
            //     lastModified: '1746348465191810',
            //     contentLength: '49708026',
            //     quality: 'hd720',
            //     fps: 30,
            //     projectionType: 'RECTANGULAR',
            //     averageBitrate: 834554,
            //     approxDurationMs: '476499',
            //     hasVideo: true,
            //     hasAudio: false,
            //     container: 'mp4',
            //     codecs: 'avc1.4d401f',
            //     videoCodec: 'avc1.4d401f',
            //     isLive: false,
            //     isHLS: false,
            //     isDashMPD: false 
            //   },
            // format: selectedFormat,
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                }
            }
        });

        let downloadedBytes = 0;
        const totalBytes = parseInt(JSON.parse(format).contentLength);

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
            console.error('Erro no stream 11:', error);
            console.error('O que ta acontecendo aqui?')
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
            console.error('Error - 1: ', error)
            res.status(500).json({
                error: 'Ocorreu um erro ao fazer o download. Por favor, tente novamente. 2',
                downloadId
            });
        }
    }
}) as RequestHandler);

// Iniciando o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em 2 http://localhost:${port}`);
});
