import { useState } from 'react'
import './PushNotifications.css'

function PushNotifications() {
  const [settings, setSettings] = useState({
    enablePush: true,
    orderStatusUpdates: true,
    promotionalNotifications: true
  })

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  return (
    <div className="push-notifications">
      <div className="push-notifications-header-content">
        <div>
          <h1 className="push-notifications-title">Push Notifications</h1>
          <p className="push-notifications-subtitle">Configure push notification settings</p>
        </div>
      </div>

      <div className="notifications-section">
        <div className="section-header">
          <h2>Push Notification Settings</h2>
        </div>
        <div className="notification-settings">
          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                checked={settings.enablePush}
                onChange={() => handleToggle('enablePush')}
              />
              Enable Push Notifications
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                checked={settings.orderStatusUpdates}
                onChange={() => handleToggle('orderStatusUpdates')}
              />
              Order Status Updates
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input 
                type="checkbox" 
                checked={settings.promotionalNotifications}
                onChange={() => handleToggle('promotionalNotifications')}
              />
              Promotional Notifications
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PushNotifications

