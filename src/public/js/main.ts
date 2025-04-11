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
            <span class="text-sm font-medium text-gray-700">Baixando vídeo...</span>
            <span class="text-sm text-gray-500 progress-percent">0%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div class="bg-purple-600 h-2.5 rounded-full progress-bar" style="width: 0%"></div>
        </div>
        <div class="mt-2 text-xs text-gray-500 progress-status"></div>
    `;
    document.body.appendChild(progressContainer);

    let eventSource: EventSource | null = null;

    // Fazer o download usando fetch e blob
    fetch('/download', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(Object.fromEntries(formData))
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
    })
    .catch(error => {
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

// Exportar as funções para o escopo global
window.getFormatDuration = getFormatDuration;
window.resetForm = resetForm;
window.getVideoInfo = getVideoInfo;
window.downloadVideo = downloadVideo; 