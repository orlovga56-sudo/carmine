/** Bridge to the Electron shell. Undefined when Carmine runs in a browser. */

export interface DesktopSpotifyTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface CarmineDesktopBridge {
  isDesktop: true
  platform: string
  spotifyRedirectUri: () => Promise<string>
  spotifyLogin: (clientId: string) => Promise<DesktopSpotifyTokens>
  openExternal: (url: string) => Promise<void>
  version: () => Promise<string>
}

declare global {
  interface Window {
    carmineDesktop?: CarmineDesktopBridge
  }
}

export const desktop: CarmineDesktopBridge | undefined = window.carmineDesktop
export const isDesktop = Boolean(desktop?.isDesktop)
export const DESKTOP_REDIRECT_URI = 'http://127.0.0.1:8899/callback'
