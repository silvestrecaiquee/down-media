export enum QualityType {
    MP4_1440P_60FPS = '1440p60',
    MP4_1080P_60FPS = '1080p60',
    MP4_720P_60FPS = '720p60',
    MP4_2160P_50FPS = '2160p50',
    MP4_1440P_50FPS = '1440p50',
    MP4_1080P_50FPS = '1080p50', 
    MP4_720P_50FPS = '720p50',
    MP4_2160P = '2160p',
    MP4_1440P = '1440p',
    MP4_1080P = '1080p',
    MP4_720P = '720p',
    MP4_480P = '480p',
    MP4_360P = '360p',
    MP4_240P = '240p',
    MP4_144P = '144p',
    MP3 = 'mp3'
}

export const QualityTypeLabel = {
    [QualityType.MP4_1440P_60FPS]: 'MP4 (1440p 60FPS)',
    [QualityType.MP4_1080P_60FPS]: 'MP4 (1080p 60FPS)',
    [QualityType.MP4_720P_60FPS]: 'MP4 (720p 60FPS)',
    [QualityType.MP4_2160P_50FPS]: 'MP4 (2160p 50FPS)',
    [QualityType.MP4_1440P_50FPS]: 'MP4 (1440p 50FPS)',
    [QualityType.MP4_1080P_50FPS]: 'MP4 (1080p 50FPS)',
    [QualityType.MP4_720P_50FPS]: 'MP4 (720p 50FPS)',
    [QualityType.MP4_2160P]: 'MP4 (2160p)',
    [QualityType.MP4_1440P]: 'MP4 (1440p)',
    [QualityType.MP4_1080P]: 'MP4 (1080p)',
    [QualityType.MP4_720P]: 'MP4 (720p)',
    [QualityType.MP4_480P]: 'MP4 (480p)',
    [QualityType.MP4_360P]: 'MP4 (360p)',
    [QualityType.MP4_240P]: 'MP4 (240p)',
    [QualityType.MP4_144P]: 'MP4 (144p)',
    [QualityType.MP3]: 'MP3 (Apenas áudio)'
}; 