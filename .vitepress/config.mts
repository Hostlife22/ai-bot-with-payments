import { defineConfig, type DefaultTheme } from 'vitepress';
import { withMermaid } from 'vitepress-plugin-mermaid';

const repository = process.env.GITHUB_REPOSITORY ?? 'Hostlife22/ai-bot-with-payments';
const base = process.env.DOCS_BASE ?? '/';
if (!base.startsWith('/') || !base.endsWith('/'))
    throw new Error('DOCS_BASE must begin and end with /.');
const filenames = [
    'configuration',
    'architecture',
    'development',
    'payments',
    'administration',
    'operations',
    'contributing',
    'security',
    'accessibility',
    'changelog',
    'third-party-notices',
    'ci-cd',
];
function sidebar(prefix: string, title: string, labels: string[]): DefaultTheme.SidebarItem[] {
    return [
        {
            text: title,
            items: filenames.map((name, index) => ({
                text: labels[index] ?? name,
                link: `${prefix}${name}`,
            })),
        },
    ];
}
export default withMermaid(
    defineConfig({
        title: 'AI Bot with Payments',
        description: 'Telegram AI bot: setup, architecture, payments, and operations.',
        base,
        cleanUrls: true,
        lastUpdated: true,
        ignoreDeadLinks: false,
        mermaid: { securityLevel: 'strict' },
        locales: {
            root: {
                label: 'English',
                lang: 'en',
                link: '/',
                themeConfig: {
                    nav: [
                        { text: 'Guide', link: '/configuration' },
                        { text: 'Changelog', link: '/changelog' },
                    ],
                    sidebar: sidebar('/', 'Documentation', [
                        'Configuration',
                        'Architecture',
                        'Development',
                        'Payments',
                        'Administration',
                        'Operations',
                        'Contributing',
                        'Security',
                        'Accessibility',
                        'Changelog',
                        'Third-party components',
                        'GitHub automation',
                    ]),
                },
            },
            ru: {
                label: 'Русский',
                lang: 'ru',
                link: '/ru/',
                description: 'Настройка, архитектура, платежи и эксплуатация Telegram AI-бота.',
                themeConfig: {
                    nav: [
                        { text: 'Руководство', link: '/ru/configuration' },
                        { text: 'Изменения', link: '/ru/changelog' },
                    ],
                    sidebar: sidebar('/ru/', 'Документация', [
                        'Конфигурация',
                        'Архитектура',
                        'Разработка',
                        'Платежи',
                        'Администрирование',
                        'Эксплуатация',
                        'Участие в разработке',
                        'Безопасность',
                        'Доступность',
                        'Изменения',
                        'Сторонние компоненты',
                        'Автоматизация GitHub',
                    ]),
                    outline: { label: 'На этой странице' },
                    docFooter: { prev: 'Предыдущая', next: 'Следующая' },
                    returnToTopLabel: 'Наверх',
                    sidebarMenuLabel: 'Меню',
                    darkModeSwitchLabel: 'Тема',
                },
            },
            zh: {
                label: '简体中文',
                lang: 'zh-CN',
                link: '/zh/',
                description: 'Telegram AI 机器人的配置、架构、支付和运维文档。',
                themeConfig: {
                    nav: [
                        { text: '指南', link: '/zh/configuration' },
                        { text: '更新日志', link: '/zh/changelog' },
                    ],
                    sidebar: sidebar('/zh/', '文档', [
                        '配置',
                        '架构',
                        '开发',
                        '支付',
                        '管理',
                        '运维',
                        '贡献指南',
                        '安全',
                        '无障碍',
                        '更新日志',
                        '第三方组件',
                        'GitHub 自动化',
                    ]),
                    outline: { label: '本页目录' },
                    docFooter: { prev: '上一页', next: '下一页' },
                    returnToTopLabel: '返回顶部',
                    sidebarMenuLabel: '菜单',
                    darkModeSwitchLabel: '主题',
                },
            },
        },
        themeConfig: {
            search: { provider: 'local' },
            socialLinks: [{ icon: 'github', link: `https://github.com/${repository}` }],
            footer: {
                message: 'Released under the MIT License.',
                copyright: 'Copyright © 2026 Hostlife22',
            },
        },
    }),
);
