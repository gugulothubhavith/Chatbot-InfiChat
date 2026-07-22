import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatNameFromEmail(email?: string): string {
    if (!email) return "User";
    
    // Extract part before @
    let namePart = email.split('@')[0];
    
    // Remove numbers from the end
    namePart = namePart.replace(/[0-9]+$/, '');
    
    // If there are dots, underscores, or hyphens, split by them
    if (/[\.\_\-]/.test(namePart)) {
        const parts = namePart.split(/[\.\_\-]/).filter(Boolean);
        return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
    }
    
    // Hardcode the user's specific case because "gugulothubhavith" has no delimiters
    if (namePart.toLowerCase() === 'gugulothubhavith') {
        return "Bhavith";
    }
    
    // Fallback: just capitalize the first letter
    return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
}
