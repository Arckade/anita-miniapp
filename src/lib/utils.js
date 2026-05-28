export const getBackendUrl = () => {
    const url = new URL(import.meta.env.VITE_BACKEND);
    return `http://${url.host}/api/v1`;
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

export const countryCodeToEmoji = (countryCode) => {
    if (!countryCode || typeof countryCode !== 'string') return '';
    const code = countryCode.toUpperCase();
    if (code.length !== 2) return '';
    const first = 0x1F1E6 + code.charCodeAt(0) - 65;
    const second = 0x1F1E6 + code.charCodeAt(1) - 65;
    return String.fromCodePoint(first, second);
};

export const countryForLanguage = (language) => {
    if (!language || typeof language !== 'string') return '';
    const code = language.trim();
    if (!code) return '';

    const root = code.split(/[-_]/)[0].toLowerCase();
    const map = {
        en: 'US',
        it: 'IT',
        es: 'ES',
        fr: 'FR',
        de: 'DE',
        pt: 'PT',
        ja: 'JP',
        zh: 'CN',
        ru: 'RU'
    };

    if (map[root]) {
        return map[root];
    }

    if (/^[A-Za-z]{2}$/.test(root)) {
        return root.toUpperCase();
    }

    return '';
};
