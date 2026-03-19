export const getBackendUrl = () => {
    return import.meta.env.VITE_BACKEND || 'http://localhost:8000';
};

export const getWsUrl = () => {
    const backend = getBackendUrl();
    return backend.replace(/^http/, 'ws');
};

export const getAudioUrl = (source) => {
    if (source.startsWith('blob:') || source.startsWith('http')) {
        return source;
    }
    const backend = getBackendUrl();
    // Rimuove lo slash finale se presente e aggiunge il path
    const baseUrl = backend.replace(/\/$/, '');
    return `${baseUrl}/recordings/${source}`;
};
