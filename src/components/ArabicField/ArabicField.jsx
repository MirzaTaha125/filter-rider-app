/**
 * Optional Arabic version of a text field. Right-to-left, inside the usual
 * .sf-field wrapper. Left empty, the app shows the English text instead.
 */
function ArabicField({
  id,
  label,
  value,
  onChange,
  disabled,
  maxLength,
  placeholder,
  multiline = false,
  rows = 3,
  hint = 'Optional. If left empty, the English text is shown.',
}) {
  const common = {
    id,
    dir: 'rtl',
    lang: 'ar',
    value: value ?? '',
    onChange: (e) => onChange(e.target.value),
    disabled,
    maxLength,
    placeholder,
  }

  return (
    <div className="sf-field">
      <label htmlFor={id}>{label} <span className="sf-optional">(Arabic)</span></label>
      {multiline ? <textarea rows={rows} {...common} /> : <input type="text" {...common} />}
      {hint && <span className="sf-hint">{hint}</span>}
    </div>
  )
}

export default ArabicField
