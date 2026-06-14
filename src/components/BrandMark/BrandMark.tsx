import './BrandMark.css'

type BrandMarkProps = {
  size?: 'sm' | 'md'
}

export function BrandMark({ size = 'md' }: BrandMarkProps) {
  return (
    <div className={`brand-mark brand-mark--${size}`} aria-hidden="true">
      <span />
      <span />
    </div>
  )
}
