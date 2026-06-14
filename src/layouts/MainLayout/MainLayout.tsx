import type { ReactNode } from 'react'
import { BrandMark } from '../../components/BrandMark/BrandMark'
import './MainLayout.css'

type MainLayoutProps = {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="main-layout">
      <header className="main-layout__header">
        <a className="main-layout__brand" href="/" aria-label="NovaMine home">
          <BrandMark size="sm" />
          <span>NovaMine</span>
        </a>
      </header>
      <main className="main-layout__content">{children}</main>
    </div>
  )
}
