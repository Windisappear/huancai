import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '幻彩 · AI 图片创作平台', description: '多模型图片创作工作台，支持文生图、参考图创作与人民币余额管理。' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
