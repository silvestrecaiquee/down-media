export const getFormats = (getInfos: any): any[] => {
    return Array.from(
        new Map(
            getInfos.formats
                .filter((format: any): any => format.qualityLabel && format.hasVideo)
                .map((format: any): any[] => [format.qualityLabel, format])
        ).values()
    ).sort((a: any, b: any): number => {
        const qualityA = parseInt(a.qualityLabel.match(/\d+/)[0]);
        const qualityB = parseInt(b.qualityLabel.match(/\d+/)[0]);
        return qualityB - qualityA;
    });
}


export const getFormatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0)
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}