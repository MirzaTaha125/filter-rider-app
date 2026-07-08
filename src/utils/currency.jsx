// Currency utility component for Saudi Riyal
export const SAR = ({ children, className = '' }) => {
  return (
    <span className={`riyal-symbol ${className}`}>
      {children}
    </span>
  )
}

// Format currency with Saudi Riyal symbol
export const formatCurrency = (amount, options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    locale = 'en-US'
  } = options

  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits
  })

  return (
    <>
      <span className="riyal-symbol">&#x20C1;</span>
      {formatted}
    </>
  )
}

// Format currency as string (for use in places where JSX isn't available)
export const formatCurrencyString = (amount, options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    locale = 'en-US'
  } = options

  const formatted = amount.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits
  })

  return `&#x20C1; ${formatted}`
}

