import type {Config} from 'tailwindcss';
export default {content:['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'],theme:{extend:{colors:{ink:'#1b1a18',ivory:'#f6f1e8',stone:'#d9d3c7',champagne:'#9c7f45',night:'#14130f'},fontFamily:{display:['var(--f-display)','serif'],body:['var(--f-body)','system-ui','sans-serif'],logo:['var(--f-logo)','serif']}}},plugins:[]} satisfies Config;
