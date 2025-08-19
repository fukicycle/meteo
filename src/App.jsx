import React, { useState, useEffect } from 'react';
// index.css import is handled in main.jsx

// Replace 'YOUR_API_KEY' with your actual WeatherAPI key
const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const WEATHER_API_BASE_URL = 'https://api.weatherapi.com/v1';
const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';

// Function to convert KPH to M/S
const kphToMs = (kph) => (kph / 3.6).toFixed(2);

// Component to display a single forecast day
const ForecastDay = ({ day, onSelect, isSelected }) => {
  const date = new Date(day.date);
  const dayName = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
  
  const cardClasses = `flex flex-col items-center bg-white bg-opacity-10 backdrop-filter backdrop-blur-md border border-gray-300 border-opacity-20 p-4 rounded-lg shadow-md flex-shrink-0 w-32 sm:w-40 md:w-48 transition-transform duration-300 cursor-pointer ${isSelected ? 'border-2 border-teal-400' : ''}`;
  
  return (
    <div className={cardClasses} onClick={() => onSelect(day)}>
      <h4 className="text-lg font-semibold">{dayName}</h4>
      <p className="text-sm text-gray-300 mb-2">{date.getMonth() + 1}/{date.getDate()}</p>
      <img src={day.day.condition.icon} alt="weather icon" className="w-12 h-12" />
      <p className="text-gray-200 mt-2 text-center text-sm whitespace-nowrap overflow-hidden text-ellipsis">{day.day.condition.text}</p>
      <div className="flex justify-between w-full mt-2 text-sm">
        <p className="font-bold text-lg text-red-300">{day.day.maxtemp_c}°C</p>
        <p className="text-lg text-blue-300">{day.day.mintemp_c}°C</p>
      </div>
    </div>
  );
};

// Component for displaying a list of favorite cities
const FavoritesList = ({ favorites, fetchWeather, removeFavorite }) => (
  <div className="w-full">
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {favorites.length > 0 ? (
        favorites.map(favCity => (
          <div 
            key={favCity.name} 
            className="flex items-center justify-between bg-white bg-opacity-10 backdrop-filter backdrop-blur-md rounded-lg p-4 shadow-md cursor-pointer transition duration-200 hover:bg-opacity-20"
            onClick={() => fetchWeather(favCity.name)}
          >
            <div className="flex items-center">
              <img src={favCity.icon} alt="weather icon" className="w-8 h-8 mr-2" />
              <div className="flex flex-col text-left">
                <p className="font-semibold text-lg text-white text-opacity-90">{favCity.name}</p>
                <p className="text-sm text-gray-300">{favCity.temp}°C</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); removeFavorite(favCity.name); }}
              className="ml-2 text-white hover:text-red-400 font-bold transition duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))
      ) : (
        <p className="col-span-full text-center text-white text-opacity-50">お気に入り都市がありません。</p>
      )}
    </div>
  </div>
);


function App() {
  const [city, setCity] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedDayData, setSelectedDayData] = useState(null);
  // New state to store search results from Nominatim
  const [searchResults, setSearchResults] = useState([]);

  const [favorites, setFavorites] = useState(() => {
    try {
      const storedFavorites = localStorage.getItem('weatherFavorites');
      return storedFavorites ? JSON.parse(storedFavorites) : [];
    } catch (e) {
      console.error("Failed to load favorites from localStorage", e);
      return [];
    }
  });

  const fetchFavoriteWeather = async (cityName) => {
    try {
      const response = await fetch(`${WEATHER_API_BASE_URL}/current.json?key=${API_KEY}&q=${cityName}&lang=ja`);
      if (response.ok) {
        const data = await response.json();
        return {
          name: data.location.name,
          temp: data.current.temp_c,
          icon: data.current.condition.icon
        };
      }
    } catch (e) {
      console.error(`Failed to fetch weather for ${cityName}`, e);
    }
    return null;
  };

  const updateAllFavoriteWeather = async () => {
    const updatedFavorites = await Promise.all(
      favorites.map(async (fav) => {
        const newFavData = await fetchFavoriteWeather(fav.name);
        return newFavData || fav;
      })
    );
    setFavorites(updatedFavorites.filter(fav => fav !== null));
    localStorage.setItem('weatherFavorites', JSON.stringify(updatedFavorites.filter(fav => fav !== null)));
  };

  useEffect(() => {
    updateAllFavoriteWeather();
  }, [favorites.length]); 

  useEffect(() => {
    const intervalId = setInterval(updateAllFavoriteWeather, 10 * 60 * 1000); 
    return () => clearInterval(intervalId);
  }, []); 

  // New function to fetch weather data by latitude and longitude
  const fetchWeatherByCoords = async (lat, lon) => {
    setLoading(true);
    setError(null);
    setWeatherData(null);
    setSelectedDayData(null);
    setSearchResults([]); // Clear search results after selection

    try {
      const response = await fetch(`${WEATHER_API_BASE_URL}/forecast.json?key=${API_KEY}&q=${lat},${lon}&days=3&lang=ja`);
      if (!response.ok) {
        throw new Error('天気情報を取得できませんでした。');
      }
      const data = await response.json();
      setWeatherData(data);
      setSelectedDayData(data.current);
      setIsFavorite(favorites.some(fav => fav.name === data.location.name));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Modified search handler to first use Nominatim API
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!city) {
      setError('都市名を入力してください');
      return;
    }
    setLoading(true);
    setError(null);
    setWeatherData(null);
    setSearchResults([]);

    try {
      const response = await fetch(`${NOMINATIM_API_URL}?q=${city}&format=json&addressdetails=1&limit=10`);
      if (!response.ok) {
        throw new Error('検索中にエラーが発生しました。');
      }
      const data = await response.json();
      // Filter results to only show cities, towns, and villages
      const filteredResults = data.filter(result => 
        result.addresstype == "city" || result.addresstype == "town" || result.addresstype == "village"
      );

      if (filteredResults.length === 0) {
        setError('見つかりませんでした。より正確な都市名で検索してください。');
      } else if (filteredResults.length === 1) {
        // If only one result, directly fetch weather
        const result = filteredResults[0];
        fetchWeatherByCoords(result.lat, result.lon);
      } else {
        // Otherwise, show the list of options to the user
        setSearchResults(filteredResults);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = () => {
    if (weatherData && !isFavorite) {
      const newFavorite = {
        name: weatherData.location.name,
        temp: weatherData.current.temp_c,
        icon: weatherData.current.condition.icon
      };
      const newFavorites = [...favorites, newFavorite];
      setFavorites(newFavorites);
      setIsFavorite(true);
    }
  };

  const removeFavorite = (cityName) => {
    const newFavorites = favorites.filter(fav => fav.name !== cityName);
    setFavorites(newFavorites);
    if (weatherData && weatherData.location.name === cityName) {
      setWeatherData(null);
    }
  };
  
  const handleDaySelect = (day) => {
    setSelectedDayData({
      condition: day.day.condition,
      temp_c: day.day.avgtemp_c,
      feelslike_c: day.day.avgtemp_c, 
      humidity: day.day.avghumidity,
      wind_kph: day.day.maxwind_kph,
      precip_mm: day.day.totalprecip_mm,
    });
  };
  
  const backToFavorites = () => {
    setWeatherData(null);
    setCity('');
    setIsFavorite(false);
    setSelectedDayData(null);
    setSearchResults([]);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-4xl lg:max-w-5xl xl:max-w-6xl bg-white bg-opacity-5 backdrop-filter backdrop-blur-lg rounded-2xl shadow-2xl p-6 md:p-8 border border-white border-opacity-20">
        
        {/* Search Bar section */}
        <div className={`transition-opacity duration-500 ease-in-out ${weatherData ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-6 text-center text-white text-opacity-90 drop-shadow-lg">Meteo</h1>
          <div className="flex flex-col sm:flex-row mb-4 items-center">
            <form onSubmit={handleSearch} className="flex-grow flex w-full">
              <input
                type="text"
                className="flex-grow p-3 rounded-l-lg bg-white bg-opacity-20 border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-teal-400 text-white placeholder-gray-300"
                placeholder="都市名を入力してください"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <button
                type="submit"
                className="p-3 bg-teal-400 hover:bg-teal-500 rounded-r-lg transition duration-200 font-medium text-white"
              >
                検索
              </button>
            </form>
          </div>
        </div>

        {loading && <p className="text-center text-gray-300 mt-6">読み込み中...</p>}
        {error && <p className="text-center text-red-300 font-semibold mt-6">{error}</p>}

        {/* Favorites list / Search results / Detailed view */}
        <div className="mt-6">
          {/* Show favorites list when no search results or weather data */}
          <div className={`transition-all duration-500 ease-in-out ${weatherData || searchResults.length > 0 ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100 h-auto'}`}>
            <FavoritesList favorites={favorites} fetchWeather={fetchWeatherByCoords} removeFavorite={removeFavorite} />
          </div>

          {/* Show search results list */}
          <div className={`transition-all duration-500 ease-in-out ${searchResults.length > 0 ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
            {searchResults.length > 0 && (
              <div>
                <h3 className="text-xl font-bold mb-4 text-center text-white text-opacity-80">検索結果を選択してください</h3>
                <ul className="space-y-2">
                  {searchResults.map((result) => (
                    <li 
                      key={result.place_id} 
                      className="bg-white bg-opacity-10 p-4 rounded-lg cursor-pointer hover:bg-opacity-20 transition duration-200"
                      onClick={() => fetchWeatherByCoords(result.lat, result.lon)}
                    >
                      <p className="font-semibold text-white">{result.display_name}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Show weather details */}
          <div className={`transition-all duration-500 ease-in-out ${weatherData ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
            {weatherData && (
              <div>
                <button
                  onClick={backToFavorites}
                  className="mb-4 text-white text-opacity-80 hover:text-white transition duration-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  お気に入りリストに戻る
                </button>

                {selectedDayData && (
                  <div className="p-6 bg-white bg-opacity-10 backdrop-filter backdrop-blur-md rounded-xl shadow-lg border border-white border-opacity-20 text-center md:p-8">
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-left">
                        <h2 className="text-2xl sm:text-3xl font-semibold text-white text-opacity-90">{weatherData.location.name}</h2>
                        <p className="text-sm text-gray-300">{weatherData.location.country}</p>
                      </div>
                      <button
                        onClick={addFavorite}
                        className={`p-2 rounded-full transition duration-200 ${isFavorite ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-300 hover:bg-yellow-400'}`}
                        title={isFavorite ? 'お気に入り登録済み' : 'お気に入りに追加'}
                        disabled={isFavorite}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex justify-center items-center my-4">
                      <img src={selectedDayData.condition.icon} alt="weather icon" className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-lg" />
                      <p className="text-6xl sm:text-7xl font-bold mt-2 sm:mt-0 sm:ml-6 text-white drop-shadow-lg">{selectedDayData.temp_c}°C</p>
                    </div>
                    <p className="text-lg text-white text-opacity-80 font-medium">{selectedDayData.condition.text}</p>
                    <div className="grid grid-cols-2 gap-4 mt-6 text-left">
                      <div>
                        <p className="text-gray-300">湿度</p>
                        <p className="text-lg font-medium text-white">{selectedDayData.humidity}%</p>
                      </div>
                      <div>
                        <p className="text-gray-300">風速</p>
                        <p className="text-lg font-medium text-white">{kphToMs(selectedDayData.wind_kph)} m/s</p>
                      </div>
                      <div>
                        <p className="text-gray-300">体感温度</p>
                        <p className="text-lg font-medium text-white">{selectedDayData.feelslike_c}°C</p>
                      </div>
                      <div>
                        <p className="text-gray-300">降水量</p>
                        <p className="text-lg font-medium text-white">{selectedDayData.precip_mm} mm</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <h3 className="text-2xl font-bold mb-4 text-center text-white text-opacity-80">3日間の予報</h3>
                  <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent">
                    {weatherData.forecast.forecastday.map((day) => (
                      <div key={day.date_epoch} className="relative z-10">
                        <ForecastDay day={day} onSelect={handleDaySelect} isSelected={selectedDayData?.condition.icon === day.day.condition.icon} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
