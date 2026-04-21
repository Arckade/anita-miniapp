import { sveltekit } from '@sveltejs/kit/vite'; // Se usi SvelteKit
// import { svelte } from '@sveltejs/vite-plugin-svelte'; // Se usi Svelte puro (senza Kit)
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        tailwindcss(),
        sveltekit() // o svelte() se non usi Kit
    ]
});