import { BrandMark } from '../../components/BrandMark/BrandMark'
import './HomePage.css'

const homeHighlights = [
  {
    label: 'Local-first',
    value: 'Data stays on device',
  },
  {
    label: 'Phase 0',
    value: 'React app shell',
  },
  {
    label: 'Focus',
    value: 'Private finance tracking',
  },
]

export function HomePage() {
  return (
    <section className="home-page" aria-labelledby="home-title">
      <div className="home-page__intro">
        <BrandMark />
        <p className="home-page__eyebrow">NovaMine foundation</p>
        <h1 id="home-title">Personal finance, kept close to you.</h1>
        <p className="home-page__summary">
          A clean React + Vite + TypeScript base for building NovaMine in small,
          reviewable phases.
        </p>
      </div>

      <div className="home-page__panel" aria-label="Phase 0 status">
        {homeHighlights.map((item) => (
          <article className="home-page__item" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
