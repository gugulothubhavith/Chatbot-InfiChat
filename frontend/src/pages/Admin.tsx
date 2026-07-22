import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import axios from "axios";

export default function Admin() {
    const { token } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get("/admin/users", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(res.data);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-6">
            <h1 className="text-3xl font-bold text-[#E5E7EB] mb-4">Admin Panel</h1>

            {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded mb-4">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-gray-400">Loading users...</div>
            ) : (
                <div className="bg-gray-900 border border-gray-700 rounded overflow-x-auto">
                    <table className="w-full text-[#E5E7EB]">
                        <thead className="bg-gray-800">
                            <tr>
                                <th className="px-4 py-2 text-left">Username</th>
                                <th className="px-4 py-2 text-left">Email</th>
                                <th className="px-4 py-2 text-left">Role</th>
                                <th className="px-4 py-2 text-left">Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-t border-gray-700">
                                    <td className="px-4 py-2">{user.username}</td>
                                    <td className="px-4 py-2">{user.email}</td>
                                    <td className="px-4 py-2">{user.role}</td>
                                    <td className="px-4 py-2">{new Date(user.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
