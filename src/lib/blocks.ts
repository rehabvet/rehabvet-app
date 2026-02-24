// Block types and renderer — safe for client-side use

export type Block =
  | { type: 'heading'; text: string; level?: 1 | 2 }
  | { type: 'text'; content: string }
  | { type: 'button'; text: string; url: string; color?: string }
  | { type: 'image'; url: string; alt?: string }
  | { type: 'divider' }
  | { type: 'spacer'; height?: number }

const PINK = '#EC6496'

export function renderBlocks(blocks: Block[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case 'heading':
        if (b.level === 2) {
          return `<h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">${b.text}</h2>`
        }
        return `<h1 style="margin:0 0 16px;font-size:28px;font-weight:800;color:#111827;line-height:1.2;letter-spacing:-0.5px;">${b.text}</h1>`
      case 'text':
        return `<p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.75;">${b.content.replace(/\n/g, '<br/>')}</p>`
      case 'button': {
        const bg = b.color || PINK
        return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td align="center"><a href="${b.url}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:15px 40px;border-radius:8px;">${b.text}</a></td></tr></table>`
      }
      case 'image':
        return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;"><tr><td align="center"><img src="${b.url}" alt="${b.alt || ''}" style="max-width:100%;height:auto;border-radius:8px;display:block;"/></td></tr></table>`
      case 'divider':
        return `<div style="border-top:1px solid #f0f0f0;margin:24px 0;"></div>`
      case 'spacer':
        return `<div style="height:${b.height || 24}px;"></div>`
      default:
        return ''
    }
  }).join('\n')
}
