/**
 * Canvas 2D 绘制成就分享卡片
 * @param {object} badge - { emoji, title, description }
 * @param {object} user - { nickname }
 * @param {object} family - { name }
 * @returns {Promise<string>} 临时文件路径
 */
export function drawBadgeCard(badge, user, family) {
  const canvasId = 'badge-share-canvas';
  const width = 600;
  const height = 800;

  return new Promise((resolve, reject) => {
    const query = uni.createSelectorQuery();
    query
      .select(`#${canvasId}`)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          reject(new Error('canvas node not found'));
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = uni.getSystemInfoSync().pixelRatio || 2;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#FFF8F5');
        gradient.addColorStop(0.5, '#FFFFFF');
        gradient.addColorStop(1, '#FFF5F0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Decorative circles
        ctx.fillStyle = 'rgba(224, 122, 95, 0.08)';
        ctx.beginPath();
        ctx.arc(500, 100, 120, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(212, 165, 90, 0.06)';
        ctx.beginPath();
        ctx.arc(80, 700, 100, 0, Math.PI * 2);
        ctx.fill();

        // Top accent line
        ctx.fillStyle = '#E07A5F';
        ctx.fillRect(0, 0, width, 8);

        // Emoji
        ctx.font = '120px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badge.emoji || '\uD83C\uDFC6', width / 2, 220);

        // Badge title
        ctx.font = 'bold 40px sans-serif';
        ctx.fillStyle = '#3A3632';
        ctx.fillText(badge.title || '', width / 2, 360);

        // Description
        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#8E8580';
        wrapText(ctx, badge.description || '', width / 2, 420, 480, 40);

        // Divider
        ctx.strokeStyle = '#F0ECE8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(100, 560);
        ctx.lineTo(500, 560);
        ctx.stroke();

        // User info
        ctx.font = '26px sans-serif';
        ctx.fillStyle = '#B5AEA8';
        ctx.textAlign = 'center';
        ctx.fillText(`${user?.nickname || ''}  \u00B7  ${family?.name || ''}`, width / 2, 610);

        // Brand
        ctx.font = '22px sans-serif';
        ctx.fillStyle = '#D5CEC8';
        ctx.fillText('\u60C5\u4FA3\u53A8\u623F', width / 2, 660);

        // Bottom accent line
        ctx.fillStyle = '#E07A5F';
        ctx.fillRect(0, height - 8, width, 8);

        // Export
        uni.canvasToTempFilePath({
          canvas,
          success: (tempRes) => resolve(tempRes.tempFilePath),
          fail: (err) => reject(err),
        });
      });
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  if (!text) return;
  const chars = text.split('');
  let line = '';
  let currentY = y;

  for (const char of chars) {
    const testLine = line + char;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, currentY);
      line = char;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
  }
}
