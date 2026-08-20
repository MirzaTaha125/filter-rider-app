import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './PageHeader.css'

function PageHeader({ title, subtitle, onBack, showBackButton = true }) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <div className="page-header">
      {showBackButton && (
        <button className="back-btn" onClick={handleBack} aria-label="Go back">
          <ChevronLeft size={20} />
        </button>
      )}
      <div className="page-header-info">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}

export default PageHeader
