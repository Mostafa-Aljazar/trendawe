import { NextResponse, type NextRequest } from 'next/server'

import { defaultLocale, isLocale } from '@/lib/i18n'

// Payload admin/API, Next internals and static files are never localized.
const isExcluded = (pathname: string) =>
  /^\/(admin|api|_next)(\/|$)/.test(pathname) || /\.[^/]+$/.test(pathname)

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (isExcluded(pathname)) return NextResponse.next()

  const [, firstSegment = ''] = pathname.split('/')

  // /en/... → canonical un-prefixed URL
  if (firstSegment === defaultLocale) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice(defaultLocale.length + 1) || '/'
    return NextResponse.redirect(url, 308)
  }

  // /ar/... is served as-is
  if (isLocale(firstSegment)) return NextResponse.next()

  // Un-prefixed paths are the default locale
  const url = request.nextUrl.clone()
  url.pathname = `/${defaultLocale}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/:path*'],
}
