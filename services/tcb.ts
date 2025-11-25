import cloudbase from '@cloudbase/js-sdk';

// 尝试从环境变量获取 EnvID，如果没有则使用空字符串 (需要用户填入)
// 在 Vite 中，环境变量通过 import.meta.env 访问
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID || 'cloud1-9gws584d117bd183';

// 初始化 CloudBase
// 注意：如果没有 EnvID，这里会报错，所以我们需要在使用前检查
export const app = cloudbase.init({
    env: ENV_ID
});

export const auth = app.auth({
    persistence: 'local' // 保持登录状态
});

export const db = app.database();

export const isCloudBaseConfigured = () => {
    return !!ENV_ID;
};
