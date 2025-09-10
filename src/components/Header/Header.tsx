import qssLogo from '../../assets/images/qss-logo.png'
import catrionLogo from '../../assets/images/catrion-blue.svg'

const Header = () => {
  return (
    <header className="flex justify-between items-center p-3 bg-[#1C2235] flex-shrink-0">
      <div className="flex items-center space-x-4">
        <img src={qssLogo} alt="QSS Logo" className="h-10 w-auto" />
      </div>
      
      <div className="flex items-center space-x-4">
        {/* <button className="flex items-center space-x-2 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors">
          <span>Filters</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button> */}
        
        {/* <div className="relative bg-white">
          <img 
            src={catrionLogo} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border-2 border-gray-600 p-1"
          />
         
        </div> */}
        <img 
            src={catrionLogo} 
            alt="Profile" 
            className="h-8 w-auto "
          />
      </div>
    </header>
  )
}

export default Header
