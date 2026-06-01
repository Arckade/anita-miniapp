<script>
    import '../app.css';
    import 'flag-icons/css/flag-icons.min.css';
    
    import favicon from '$lib/assets/favicon.svg';

    let { children } = $props();
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}