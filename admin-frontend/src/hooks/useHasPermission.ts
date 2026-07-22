import { useAuth } from './useAuth';

export function useHasPermission(permissionRequired: string): boolean {
    const { user } = useAuth();
    if (!user) return false;
    if (user.permissions?.includes("super_admin")) return true;
    return user.permissions?.includes(permissionRequired) || false;
}

export function useIsSuperAdmin(): boolean {
    const { user } = useAuth();
    if (!user) return false;
    return user.permissions?.includes("super_admin") || false;
}
