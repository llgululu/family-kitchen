/**
 * Conventional Commits 规范
 * @see https://www.conventionalcommits.org/
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // bug 修复
        'docs',     // 文档变更
        'style',    // 代码格式（不影响功能）
        'refactor', // 重构
        'perf',     // 性能优化
        'test',     // 测试
        'build',    // 构建系统或依赖变更
        'ci',       // CI 配置
        'chore',    // 杂项
        'revert',   // 回滚
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'backend',
        'admin',
        'mini-app',
        'shared',
        'docs',
        'deps',
        'release',
        'root',
      ],
    ],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
  },
};
