import { apiBaseUrl } from './http.js';

/**
 * 走 uni.uploadFile 上传单图到 /storage/upload?category=...
 * @returns {Promise<{ url: string, key: string, size: number, mimeType: string }>}
 */
export function uploadImage(filePath, category = 'other') {
  const token = uni.getStorageSync('token') || '';
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: `${apiBaseUrl}/storage/upload?category=${encodeURIComponent(category)}`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            uni.showToast({ title: data?.message || '上传失败', icon: 'none' });
            reject(data);
          }
        } catch (err) {
          uni.showToast({ title: '上传响应解析失败', icon: 'none' });
          reject(err);
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      },
    });
  });
}

/**
 * 从相册选 1~N 张图，依次上传，返回 URL 数组。
 */
export async function chooseAndUploadImages({ count = 5, category = 'other' } = {}) {
  const chosen = await new Promise((resolve, reject) => {
    uni.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: resolve,
      fail: reject,
    });
  });
  const filePaths = chosen.tempFilePaths || [];
  const results = [];
  for (const path of filePaths) {
    // eslint-disable-next-line no-await-in-loop
    const r = await uploadImage(path, category);
    results.push(r);
  }
  return results;
}
