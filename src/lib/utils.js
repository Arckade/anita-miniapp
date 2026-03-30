export const getWsUrl = () => {
    const url = `${import.meta.env.VITE_BACKEND}/770333918`;
    return url.startsWith('ws') ? url : url.replace(/^http/, 'ws');
};

export const getBackendUrl = () => {
    const url = import.meta.env.VITE_BACKEND;
    return url.startsWith('http') ? url : `https://${url}`;
};

/**
 * Converte una sorgente audio in URL riproducibile
 * @param {string|null} source - Base64 puro, data URL, blob:, o path relativo
 * @param {string|null} format
 * @returns {string|null} URL riproducibile o null
 */
export const getAudioUrl = (source, format = 'webm') => {
    if (!source) return null;

    // URLs già pronti
    if (source.startsWith('blob:') || source.startsWith('http') || source.startsWith('data:')) {
        return source;
    }

    // Base64 puro
    if (/^[A-Za-z0-9+/=\s]+$/.test(source) && source.replace(/\s/g, '').length > 100) {
        const cleanBase64 = source.replace(/\s/g, '');

        // Mappa formato → mime type corretto
        const mimeTypes = {
            'mp3': 'audio/mpeg',
            'ogg': 'audio/ogg',
            'webm': 'audio/webm',
            'wav': 'audio/wav'
        };
        const mime = mimeTypes[format] || 'audio/webm';

        return `data:${mime};base64,${cleanBase64}`;
    }

    const backend = getBackendUrl();
    return `${backend.replace(/\/$/, '')}/recordings/${source}`;
};