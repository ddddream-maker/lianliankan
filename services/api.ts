
import { User, LeaderboardEntry } from '../types';

// Safely retrieve environment variables to avoid runtime errors
const getMetaEnv = () => {
    try {
        // @ts-ignore: import.meta is a meta-property, env is injected by Vite
        return import.meta.env || {};
    } catch (e) {
        return {};
    }
};

const metaEnv = getMetaEnv();

// 1. 尝试从环境变量获取 API 地址 (用于生产环境配置)
// 2. 如果没有环境变量，且是开发环境，尝试 localhost
// 3. 否则 (如部署在静态托管且未配置后端)，留空以触发离线模式
const ENV_API_URL = metaEnv.VITE_API_URL;
const IS_DEV = metaEnv.DEV;

export const API_BASE_URL = ENV_API_URL || (IS_DEV ? 'http://localhost:3001' : '');

// Helper to check if server is alive
export const checkHealth = async (): Promise<boolean> => {
    // 如果没有配置 API URL，直接返回 false，进入纯单机模式
    if (!API_BASE_URL) return false;

    try {
        // 设置超时，避免在没有后端时页面卡顿
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(`${API_BASE_URL}/api/health`, { 
            signal: controller.signal,
            mode: 'cors'
        });
        
        clearTimeout(timeoutId);
        return res.ok;
    } catch (e) {
        return false;
    }
};

export const apiLogin = async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    if (!API_BASE_URL) return { success: false, message: 'Offline Mode' };
    
    try {
        const res = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: '无法连接服务器' };
    }
};

export const apiRegister = async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    if (!API_BASE_URL) return { success: false, message: 'Offline Mode' };

    try {
        const res = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        return await res.json();
    } catch (e) {
        return { success: false, message: '注册请求失败' };
    }
};

export const apiUpdateScore = async (username: string, difficulty: string, score: number, timeUsed: number) => {
    if (!API_BASE_URL) return;

    try {
        await fetch(`${API_BASE_URL}/api/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, difficulty, score, timeUsed })
        });
    } catch (e) {
        console.warn('Failed to upload score', e);
    }
};

export const apiGetLeaderboard = async (difficulty: string): Promise<LeaderboardEntry[]> => {
    if (!API_BASE_URL) return [];

    try {
        const res = await fetch(`${API_BASE_URL}/api/leaderboard?difficulty=${difficulty}`);
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        return [];
    }
};
