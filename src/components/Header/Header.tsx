import qssLogo from '../../assets/images/qss-logo.png'
import catrionLogo from '../../assets/images/catrion.png'

interface HeaderProps {
  onLogout: () => void
}

const Header = ({ onLogout }: HeaderProps) => {
  return (
    <header className="w-full bg-[#171C2A] px-6 py-4 flex items-center justify-between shadow-lg">
      {/* Left side - QSS Branding */}
      <div className="flex items-center space-x-4">
       
         <img 
          src={catrionLogo} 
          alt="Catrion Logo" 
          className="h-7 w-auto"
        />
      </div>

      {/* Right side - Catrion Logo and Logout Button */}
      <div className="flex items-center space-x-4">
      <img 
          src={qssLogo} 
          alt="QSS Logo" 
          className="h-10 w-auto pt-1"
        />
        <button
          onClick={onLogout}
          className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-700 transition-colors duration-200"
          title="Logout"
          aria-label="Logout"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            className="w-6 h-6 text-white hover:text-red-400 transition-colors"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" 
            />
          </svg>
        </button>
      </div>
    </header>
  )
}

export default Header

