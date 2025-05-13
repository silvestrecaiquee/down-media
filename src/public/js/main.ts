// Declaração de tipos globais
declare module 'global' {
    interface Window {
        getFormatDuration: (seconds: number) => string;
        resetForm: () => void;
        getVideoInfo: () => void;
        downloadVideo: () => void;
    }
}

interface VideoFormat {
    qualityLabel: string;
    contentLength?: string;
}

interface ProgressData {
    status: 'starting' | 'downloading' | 'completed' | 'error';
    progress?: number;
    downloadedBytes?: number;
    totalBytes?: number;
    error?: string;
    title?: string;
}

// Funções globais
function getFormatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function resetForm(): void {
    const form = document.getElementById('downloadForm') as HTMLFormElement;
    if (form) {
        form.reset();
    }
}

function getVideoInfo(): void {
    const form = document.getElementById('downloadForm') as HTMLFormElement;
    const formData = new FormData(form);
    const url = formData.get('url') as string;
    const loading = document.getElementById('loading');
    const videoContent = document.getElementById('video-content');
    
    if (!url) {
        window.location.href = '/?error=' + encodeURIComponent('Por favor, insira uma URL do YouTube');
        return;
    }

    // Esconder todos os containers de conteúdo anteriores, exceto o loading
    document.querySelectorAll('.max-w-3xl.mx-auto.mt-8.bg-white:not(#loading)').forEach(container => {
        (container as HTMLElement).style.display = 'none';
    });

    // Limpar área de conteúdo dinâmico
    if (videoContent) {
        videoContent.innerHTML = '';
    }

    // Mostrar loading
    if (loading) {
        loading.classList.remove('hidden');
    }

    fetch('/video-info', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ url }).toString()
    })
    .then(response => response.json())
    .then(data => {
        // Esconder loading
        if (loading) {
            loading.classList.add('hidden');
        }
        
        if (data.error) {
            // Mostrar todos os containers anteriores em caso de erro, exceto o loading
            document.querySelectorAll('.max-w-3xl.mx-auto.mt-8.bg-white:not(#loading)').forEach(container => {
                (container as HTMLElement).style.display = 'block';
            });
            window.location.href = '/?error=' + encodeURIComponent(data.error);
            return;
        }
        window.location.href = '/?url=' + encodeURIComponent(url);
    })
    .catch(error => {
        // Esconder loading
        if (loading) {
            loading.classList.add('hidden');
        }
        
        // Mostrar todos os containers anteriores em caso de erro, exceto o loading
        document.querySelectorAll('.max-w-3xl.mx-auto.mt-8.bg-white:not(#loading)').forEach(container => {
            (container as HTMLElement).style.display = 'block';
        });
        
        console.error('Error:', error);
        window.location.href = '/?error=' + encodeURIComponent('Ocorreu um erro ao buscar as informações do vídeo. Por favor, tente novamente.');
    });
}

function downloadVideo(): void {
    const form = document.getElementById('downloadForm') as HTMLFormElement;
    const formData = new FormData(form);
    const formatSelect = document.querySelector('select[name="format"]') as HTMLSelectElement;
    
    // Pega a URL da query string se existir
    const urlParams = new URLSearchParams(window.location.search);
    const urlFromQuery = urlParams.get('url');
    
    if (urlFromQuery) {
        formData.set('url', urlFromQuery);
    }
    
    if (formatSelect) {
        const selectedFormat = JSON.parse(formatSelect.value) as VideoFormat;
        formData.set('format', JSON.stringify(selectedFormat));
    }

    // Criar e mostrar o elemento de progresso
    const progressContainer = document.createElement('div');
    progressContainer.className = 'fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-[300px]';
    progressContainer.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
                <button class="pause-download p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                </button>
                <button class="play-download hidden p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />
                    </svg>
                </button>
                <span class="text-sm font-medium text-gray-700">Baixando vídeo...</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500 progress-percent">0%</span>
                <button class="close-download p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div class="bg-purple-600 h-2.5 rounded-full progress-bar" style="width: 0%"></div>
        </div>
        <div class="mt-2 text-xs text-gray-500 progress-status"></div>
    `;
    document.body.appendChild(progressContainer);

    let eventSource: EventSource | null = null;
    let abortController: AbortController | null = null;
    let downloadPaused = false;
    let lastProgress = 0;

    // Adicionar event listeners para os botões
    const pauseButton = progressContainer.querySelector('.pause-download');
    const playButton = progressContainer.querySelector('.play-download');
    const closeButton = progressContainer.querySelector('.close-download');

    pauseButton?.addEventListener('click', () => {
        downloadPaused = true;
        pauseButton.classList.add('hidden');
        playButton?.classList.remove('hidden');
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        if (abortController) {
            abortController.abort();
            abortController = null;
        }
    });

    playButton?.addEventListener('click', () => {
        downloadPaused = false;
        playButton.classList.add('hidden');
        pauseButton?.classList.remove('hidden');
        // Reiniciar o download de onde parou
        startDownload();
    });

    closeButton?.addEventListener('click', () => {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        if (abortController) {
            abortController.abort();
            abortController = null;
        }
        progressContainer.remove();
    });

    function startDownload() {
        abortController = new AbortController();
        const signal = abortController.signal;

        // Fazer o download usando fetch e blob
        fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...Object.fromEntries(formData),
                resumeFrom: downloadPaused ? lastProgress : 0
            }),
            signal
        })
        .then(async response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Pegar o ID do download do header
            const downloadId = response.headers.get('X-Download-Id');
            
            // Pegar o nome do arquivo do Content-Disposition
            const contentDisposition = response.headers.get('Content-Disposition');
            const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
            const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'video.mp4';
            
            if (downloadId) {
                // Conectar ao SSE para receber atualizações de progresso
                eventSource = new EventSource(`/download-progress/${downloadId}`);
                
                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data) as ProgressData;
                        const progressBar = progressContainer.querySelector('.progress-bar') as HTMLElement;
                        const progressPercent = progressContainer.querySelector('.progress-percent') as HTMLElement;
                        const progressStatus = progressContainer.querySelector('.progress-status') as HTMLElement;

                        if (progressBar && progressPercent && progressStatus) {
                            if (data.status === 'downloading' && data.progress !== undefined) {
                                lastProgress = data.progress;
                                progressBar.style.width = `${data.progress}%`;
                                progressPercent.textContent = `${data.progress}%`;
                                
                                // Calcular velocidade e tempo restante
                                if (data.downloadedBytes && data.totalBytes) {
                                    const downloaded = (data.downloadedBytes / 1024 / 1024).toFixed(2);
                                    const total = (data.totalBytes / 1024 / 1024).toFixed(2);
                                    progressStatus.textContent = `${downloaded} MB de ${total} MB`;
                                }
                            }
                            
                            if (data.status === 'completed') {
                                if (eventSource) {
                                    eventSource.close();
                                    eventSource = null;
                                }
                                setTimeout(() => {
                                    if (progressContainer && progressContainer.parentNode) {
                                        progressContainer.remove();
                                    }
                                }, 3000);
                            }
                            
                            if (data.status === 'error') {
                                if (eventSource) {
                                    eventSource.close();
                                    eventSource = null;
                                }
                                progressContainer.innerHTML = `
                                    <div class="text-red-500">${data.error || 'Erro desconhecido'}</div>
                                `;
                                setTimeout(() => {
                                    if (progressContainer && progressContainer.parentNode) {
                                        progressContainer.remove();
                                    }
                                }, 3000);
                            }
                        }
                    } catch (error) {
                        console.error('Error processing progress update:', error);
                    }
                };
            }
            
            // Aguardar o blob estar pronto
            const blob = await response.blob();
            return { blob, filename };
        })
        .then(({ blob, filename }) => {
            if (!downloadPaused) {
                try {
                    // Criar um link temporário para download
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                } catch (error) {
                    console.error('Error creating download link:', error);
                    throw error;
                }
            }
        })
        .catch(error => {
            if (error.name === 'AbortError') {
                console.log('Download cancelled');
                return;
            }
            console.error('Error:', error);
            if (progressContainer && progressContainer.parentNode) {
                progressContainer.innerHTML = `
                    <div class="text-red-500">Erro ao fazer download</div>
                `;
                setTimeout(() => progressContainer.remove(), 3000);
            }
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
        });
    }

    // Iniciar o download
    startDownload();
}

// Exportar as funções para o escopo global
window.getFormatDuration = getFormatDuration;
window.resetForm = resetForm;
window.getVideoInfo = getVideoInfo; 
window.downloadVideo = downloadVideo; 