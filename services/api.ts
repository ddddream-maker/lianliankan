
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

// Local API calls are deprecated in favor of CloudBase SDK
// Keeping minimal structure for compatibility if needed, but mostly unused now.

export const checkHealth = async (): Promise<boolean> => {
    return false; // Force offline/cloud mode logic
};

export const apiLogin = async (username: string, password: string) => {
    return { success: false, message: 'Deprecated' };
};

export const apiRegister = async (username: string, password: string) => {
    return { success: false, message: 'Deprecated' };
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

export const apiGetLeaderboard = async (difficulty: string) => {
    return [];
};

export const apiUpdateUserStats = async (username: string, stats: any) => {
    return { success: false, message: 'Deprecated' };
};
