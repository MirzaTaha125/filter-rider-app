import { useState } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import './Layout.css'

function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  return (
    <div className="layout-container">
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      ></div>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="layout-content">
        <TopBar onMenuClick={toggleSidebar} />
        <main className="layout-main">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout

