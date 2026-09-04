// =====================WEATHER NOW - WEATHER DASHBOARD=====================================//

// This file controls:
// 1. OpenWeatherMap API requests
// 2. Current weather display
// 3. Five-day forecast
// 4. Celsius / Fahrenheit conversion
// 5. Search history
// 6. localStorage
// 7. Loading and error states
// 8. Optional caching for offline use




// ============================================================
// 1. API CONFIGURATION
// ============================================================


const API_KEY = "f9a58ba5819f6bb37862aac46523c5e9";


// OpenWeatherMap API endpoint for current weather.
const CURRENT_WEATHER_URL =
    "https://api.openweathermap.org/data/2.5/weather";


// OpenWeatherMap API endpoint for 5-day forecast.
const FORECAST_URL =
    "https://api.openweathermap.org/data/2.5/forecast";


// Maximum number of cities stored in search history.
const MAX_HISTORY_ITEMS = 10;


// localStorage keys.
//
// Keeping them in variables makes them easier
// to reuse and avoids typing mistakes.
const STORAGE_KEYS = {
    unit: "weatherUnit",
    history: "weatherHistory",
    cache: "weatherCache"
};


// ============================================================
// 2. SELECT DOM ELEMENTS
// ============================================================

// ------------------------------
// Search elements
// ------------------------------

const searchForm =
    document.getElementById("search-form");

const cityInput =
    document.getElementById("city-input");


// ------------------------------
// Current weather elements
// ------------------------------

const currentWeatherSection =
    document.getElementById("current-weather");

const cityNameElement =
    document.getElementById("city-name");

const currentDateElement =
    document.getElementById("current-date");

const weatherIconElement =
    document.getElementById("weather-icon");

const currentTemperatureElement =
    document.getElementById("current-temperature");

const weatherDescriptionElement =
    document.getElementById("weather-description");

const feelsLikeElement =
    document.getElementById("feels-like");

const humidityElement =
    document.getElementById("humidity");

const windSpeedElement =
    document.getElementById("wind-speed");

const pressureElement =
    document.getElementById("pressure");


// ------------------------------
// Forecast elements
// ------------------------------

const forecastSection =
    document.getElementById("forecast-section");

const forecastContainer =
    document.getElementById("forecast-container");


// ------------------------------
// Search history elements
// ------------------------------

const searchHistoryElement =
    document.getElementById("search-history");

const clearHistoryButton =
    document.getElementById("clear-history-btn");


// ------------------------------
// Temperature unit buttons
// ------------------------------

const celsiusButton =
    document.getElementById("celsius-btn");

const fahrenheitButton =
    document.getElementById("fahrenheit-btn");


// ------------------------------
// Loading and error elements
// ------------------------------

const loadingElement =
    document.getElementById("loading");

const errorMessageElement =
    document.getElementById("error-message");


// ============================================================
// 3. APPLICATION STATE
// ============================================================

// Read the user's preferred unit from localStorage.
//
// If no preference exists, Celsius is used.
let currentUnit =
    localStorage.getItem(STORAGE_KEYS.unit) || "C";


// Store the most recently fetched current weather.
//
// This allows us to switch between Celsius and
// Fahrenheit without making another API request.
let currentWeatherData = null;


// Store the most recently fetched forecast.
//
// Again, this allows temperature conversion
// without re-fetching data.
let currentForecastData = null;


// Read search history from localStorage.
//
// JSON.parse() converts the saved JSON string
// back into a JavaScript array.
let searchHistory =
    JSON.parse(
        localStorage.getItem(STORAGE_KEYS.history)
    ) || [];


// ============================================================
// 4. MAIN WEATHER API FUNCTION
// ============================================================

async function fetchWeather(city) {

    // Remove spaces from the beginning and end.
    const cleanedCity = city.trim();


    // Do not continue if the search is empty.
    if (!cleanedCity) {

        showError(
            "Please enter a city name."
        );

        return;
    }


    // Make sure the developer has added an API key.
    if (
        !API_KEY ||
        API_KEY === "YOUR_API_KEY_HERE"
    ) {

        showError(
            "Please add your OpenWeatherMap API key in app.js."
        );

        return;
    }


    try {

        // Show loading state.
        showLoading();


        // Remove old errors.
        hideError();


        // Encode the city so city names containing
        // spaces work correctly in the URL.
        //
        // Example:
        // "New York" becomes "New%20York"
        const encodedCity =
            encodeURIComponent(cleanedCity);


        // We always fetch data in metric units.
        //
        // This means temperatures arrive in Celsius.
        // Fahrenheit conversion is handled locally.
        const currentUrl =
            `${CURRENT_WEATHER_URL}?q=${encodedCity}&appid=${API_KEY}&units=metric`;


        const forecastUrl =
            `${FORECAST_URL}?q=${encodedCity}&appid=${API_KEY}&units=metric`;


        // Fetch current weather and forecast at
        // the same time using Promise.all().
        //
        // This is faster than waiting for one API
        // request before starting the other.
        const [
            currentResponse,
            forecastResponse
        ] = await Promise.all([

            fetch(currentUrl),

            fetch(forecastUrl)

        ]);


        // --------------------------------------------
        // HANDLE HTTP ERRORS
        // --------------------------------------------

        // City does not exist.
        if (
            currentResponse.status === 404 ||
            forecastResponse.status === 404
        ) {

            throw new Error(
                "City not found. Try a different search."
            );
        }


        // Invalid or inactive API key.
        if (
            currentResponse.status === 401 ||
            forecastResponse.status === 401
        ) {

            throw new Error(
                "Invalid API key. Check your OpenWeatherMap API key."
            );
        }


        // Too many API requests.
        if (
            currentResponse.status === 429 ||
            forecastResponse.status === 429
        ) {

            throw new Error(
                "Too many weather requests. Please try again shortly."
            );
        }


        // Handle other unsuccessful HTTP responses.
        if (
            !currentResponse.ok ||
            !forecastResponse.ok
        ) {

            throw new Error(
                "Unable to retrieve weather information."
            );
        }


        // --------------------------------------------
        // CONVERT RESPONSES TO JAVASCRIPT OBJECTS
        // --------------------------------------------

        const currentData =
            await currentResponse.json();


        const forecastData =
            await forecastResponse.json();


        // --------------------------------------------
        // SAVE DATA TO APPLICATION STATE
        // --------------------------------------------

        currentWeatherData =
            currentData;

        currentForecastData =
            forecastData;


        // --------------------------------------------
        // DISPLAY DATA
        // --------------------------------------------

        displayCurrentWeather(
            currentWeatherData
        );


        displayForecast(
            currentForecastData
        );


        // --------------------------------------------
        // SAVE SUCCESSFUL SEARCH
        // --------------------------------------------

        addToSearchHistory(
            currentData.name
        );


        // Save latest successful result as
        // optional offline cached data.
        saveWeatherCache(
            currentData,
            forecastData
        );


        // Clear the search input.
        cityInput.value = "";


    } catch (error) {

        // If there is no internet connection,
        // try to display the last cached weather.
        if (!navigator.onLine) {

            const cacheLoaded =
                loadCachedWeather();

            if (!cacheLoaded) {

                showError(
                    "You appear to be offline and no cached weather data is available."
                );

            }

        } else {

            // Display normal API/network error.
            showError(
                error.message
                ||
                "Something went wrong while retrieving weather data."
            );

        }

    } finally {

        // This always runs whether the request
        // succeeds or fails.
        hideLoading();

    }

}


// ============================================================
// 5. DISPLAY CURRENT WEATHER
// ============================================================

function displayCurrentWeather(data) {

    // Use object destructuring to extract
    // properties from the API response.
    const {
        name,
        sys,
        main,
        weather,
        wind,
        dt,
        timezone
    } = data;


    // The weather property is an array.
    //
    // The first item contains the primary
    // weather condition.
    const weatherInfo =
        weather[0];


    // --------------------------------------------
    // CITY AND COUNTRY
    // --------------------------------------------

    cityNameElement.textContent =
        `${name}, ${sys.country}`;


    // --------------------------------------------
    // LOCAL DATE AND TIME
    // --------------------------------------------

    currentDateElement.textContent =
        formatCityDateTime(
            dt,
            timezone
        );


    // --------------------------------------------
    // TEMPERATURE
    // --------------------------------------------

    currentTemperatureElement.textContent =
        formatTemperature(
            main.temp
        );


    // --------------------------------------------
    // FEELS LIKE
    // --------------------------------------------

    feelsLikeElement.textContent =
        formatTemperature(
            main.feels_like
        );


    // --------------------------------------------
    // HUMIDITY
    // --------------------------------------------

    humidityElement.textContent =
        `${main.humidity}%`;


    // --------------------------------------------
    // PRESSURE
    // --------------------------------------------

    pressureElement.textContent =
        `${main.pressure} hPa`;


    // --------------------------------------------
    // WIND SPEED
    // --------------------------------------------

    windSpeedElement.textContent =
        `${wind.speed} m/s`;


    // --------------------------------------------
    // WEATHER DESCRIPTION
    // --------------------------------------------

    weatherDescriptionElement.textContent =
        capitalizeWords(
            weatherInfo.description
        );


    // --------------------------------------------
    // WEATHER ICON
    // --------------------------------------------

    weatherIconElement.src =
        `https://openweathermap.org/img/wn/${weatherInfo.icon}@2x.png`;


    weatherIconElement.alt =
        weatherInfo.description;


    // Show the weather section.
    currentWeatherSection.classList.remove(
        "hidden"
    );


    // Optional bonus:
    // Change the body's weather class.
    updateWeatherBackground(
        weatherInfo.main,
        weatherInfo.icon
    );

}


// ============================================================
// 6. CITY DATE AND TIME
// ============================================================

function formatCityDateTime(
    timestamp,
    timezoneOffset
) {

    // OpenWeatherMap Unix timestamps use seconds.
    //
    // JavaScript Date uses milliseconds.
    //
    // The timezone offset is also supplied
    // by OpenWeatherMap in seconds.
    const date =
        new Date(
            (timestamp + timezoneOffset) * 1000
        );


    // Because we already applied the city's
    // timezone offset manually, UTC is used
    // when formatting the resulting Date.
    return date.toLocaleString(
        "en-US",
        {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",

            hour: "2-digit",
            minute: "2-digit",

            timeZone: "UTC"
        }
    );

}


// ============================================================
// 7. TEMPERATURE FUNCTIONS
// ============================================================

// Convert Celsius into Fahrenheit.
function celsiusToFahrenheit(celsius) {

    return (
        celsius * 9 / 5
    ) + 32;

}


// Format a temperature according to the
// currently selected unit.
function formatTemperature(celsius) {

    // Celsius selected.
    if (currentUnit === "C") {

        return `${Math.round(celsius)}°C`;

    }


    // Fahrenheit selected.
    const fahrenheit =
        celsiusToFahrenheit(celsius);


    return `${Math.round(fahrenheit)}°F`;

}


// Change the selected temperature unit.
function changeUnit(unit) {

    // Stop if the requested unit is invalid.
    if (
        unit !== "C" &&
        unit !== "F"
    ) {

        return;

    }


    // Update application state.
    currentUnit = unit;


    // Save preference to localStorage.
    localStorage.setItem(
        STORAGE_KEYS.unit,
        currentUnit
    );


    // Update button appearance.
    updateUnitButtons();


    // Re-render the existing current weather.
    //
    // IMPORTANT:
    // No new fetch() request is made.
    if (currentWeatherData) {

        displayCurrentWeather(
            currentWeatherData
        );

    }


    // Re-render the existing forecast.
    //
    // Again, no new API request.
    if (currentForecastData) {

        displayForecast(
            currentForecastData
        );

    }

}


// Update active button styling.
function updateUnitButtons() {

    if (currentUnit === "C") {

        celsiusButton.classList.add(
            "active"
        );

        fahrenheitButton.classList.remove(
            "active"
        );

    } else {

        fahrenheitButton.classList.add(
            "active"
        );

        celsiusButton.classList.remove(
            "active"
        );

    }

}


// ============================================================
// 8. FORECAST HELPER FUNCTIONS
// ============================================================

// Convert an API timestamp into the searched
// city's local date.
function getCityDate(
    timestamp,
    timezoneOffset
) {

    return new Date(
        (timestamp + timezoneOffset) * 1000
    );

}


// Create a YYYY-MM-DD date key.
//
// Example:
//
// 2026-09-05
function getDateKey(
    timestamp,
    timezoneOffset
) {

    const cityDate =
        getCityDate(
            timestamp,
            timezoneOffset
        );


    const year =
        cityDate.getUTCFullYear();


    const month =
        String(
            cityDate.getUTCMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            cityDate.getUTCDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


// Capitalise each word in a string.
//
// Example:
//
// "light rain"
//
// becomes:
//
// "Light Rain"
function capitalizeWords(text) {

    return text

        .split(" ")

        .map(function(word) {

            return (
                word.charAt(0).toUpperCase()
                +
                word.slice(1)
            );

        })

        .join(" ");

}


// ============================================================
// 9. PROCESS 5-DAY FORECAST
// ============================================================

function processForecast(data) {

    // OpenWeatherMap provides approximately
    // one forecast every 3 hours.
    const forecastList =
        data.list;


    // Timezone offset for the searched city.
    const timezoneOffset =
        data.city.timezone;


    // Object used to group forecasts by date.
    const groupedForecasts = {};


    // --------------------------------------------
    // GROUP 3-HOUR FORECASTS BY DAY
    // --------------------------------------------

    forecastList.forEach(
        function(forecast) {

            // Find the local date for the forecast.
            const dateKey =
                getDateKey(
                    forecast.dt,
                    timezoneOffset
                );


            // Create an empty array if the
            // date has not been added yet.
            if (
                !groupedForecasts[
                    dateKey
                ]
            ) {

                groupedForecasts[
                    dateKey
                ] = [];

            }


            // Add the forecast to that day.
            groupedForecasts[
                dateKey
            ].push(
                forecast
            );

        }
    );


    // --------------------------------------------
    // FIND TODAY'S DATE FOR THAT CITY
    // --------------------------------------------

    const currentTimestamp =
        Math.floor(
            Date.now() / 1000
        );


    const todayKey =
        getDateKey(
            currentTimestamp,
            timezoneOffset
        );


    // --------------------------------------------
    // CONVERT GROUPS INTO DAILY FORECASTS
    // --------------------------------------------

    const dailyForecasts =
        Object.entries(
            groupedForecasts
        )

            // Skip today.
            //
            // The current weather card already
            // represents today's weather.
            .filter(
                function([dateKey]) {

                    return (
                        dateKey !==
                        todayKey
                    );

                }
            )


            // Take only the next five days.
            .slice(0, 5)


            // Convert each day's many forecasts
            // into one simplified daily object.
            .map(
                function([
                    dateKey,
                    forecasts
                ]) {

                    // --------------------------------
                    // DAILY HIGH
                    // --------------------------------

                    const highTemperature =
                        Math.max(

                            ...forecasts.map(
                                function(forecast) {

                                    return (
                                        forecast
                                            .main
                                            .temp_max
                                    );

                                }
                            )

                        );


                    // --------------------------------
                    // DAILY LOW
                    // --------------------------------

                    const lowTemperature =
                        Math.min(

                            ...forecasts.map(
                                function(forecast) {

                                    return (
                                        forecast
                                            .main
                                            .temp_min
                                    );

                                }
                            )

                        );


                    // --------------------------------
                    // REPRESENTATIVE WEATHER
                    // --------------------------------
                    //
                    // We choose the forecast closest
                    // to midday because it usually
                    // gives a useful representation
                    // of the day's weather.

                    let representativeForecast =
                        forecasts[0];


                    let smallestDifference =
                        Infinity;


                    forecasts.forEach(
                        function(forecast) {

                            const cityDate =
                                getCityDate(
                                    forecast.dt,
                                    timezoneOffset
                                );


                            const hour =
                                cityDate
                                    .getUTCHours();


                            // Measure distance
                            // from 12 PM.
                            const difference =
                                Math.abs(
                                    12 - hour
                                );


                            if (
                                difference
                                <
                                smallestDifference
                            ) {

                                smallestDifference =
                                    difference;


                                representativeForecast =
                                    forecast;

                            }

                        }
                    );


                    // Return a clean daily object.
                    return {

                        date:
                            dateKey,

                        high:
                            highTemperature,

                        low:
                            lowTemperature,

                        condition:
                            representativeForecast
                                .weather[0]
                                .description,

                        icon:
                            representativeForecast
                                .weather[0]
                                .icon

                    };

                }
            );


    return dailyForecasts;

}


// ============================================================
// 10. DISPLAY 5-DAY FORECAST
// ============================================================

function displayForecast(data) {

    // Process the API forecast data.
    const fiveDayForecast =
        processForecast(data);


    // Remove previous forecast cards.
    forecastContainer.innerHTML =
        "";


    // Create one card for each forecast day.
    fiveDayForecast.forEach(
        function(day) {

            // Create the card element.
            const forecastCard =
                document.createElement(
                    "div"
                );


            // Add CSS class.
            forecastCard.classList.add(
                "forecast-card"
            );


            // Convert date string into
            // a JavaScript Date object.
            const date =
                new Date(
                    `${day.date}T00:00:00Z`
                );


            // Get weekday name.
            //
            // Example:
            //
            // Friday
            // Saturday
            const dayName =
                date.toLocaleDateString(
                    "en-US",
                    {
                        weekday: "long",
                        timeZone: "UTC"
                    }
                );


            // OpenWeatherMap weather icon.
            const iconUrl =
                `https://openweathermap.org/img/wn/${day.icon}@2x.png`;


            // Build forecast card HTML.
            forecastCard.innerHTML = `

                <h3>
                    ${dayName}
                </h3>

                <img
                    src="${iconUrl}"
                    alt="${day.condition}"
                >

                <div class="forecast-temperatures">

                    <span class="forecast-high">
                        ${formatTemperature(day.high)}
                    </span>

                    <span class="forecast-low">
                        ${formatTemperature(day.low)}
                    </span>

                </div>

                <p class="forecast-condition">
                    ${capitalizeWords(day.condition)}
                </p>

            `;


            // Add the card to the page.
            forecastContainer.appendChild(
                forecastCard
            );

        }
    );


    // Show forecast section.
    forecastSection.classList.remove(
        "hidden"
    );

}


// ============================================================
// 11. SEARCH HISTORY
// ============================================================

function addToSearchHistory(city) {

    // Remove duplicate versions of the city.
    //
    // Example:
    //
    // If "Canberra" already exists and the
    // user searches it again, the old copy
    // is removed.
    searchHistory =
        searchHistory.filter(
            function(historyCity) {

                return (
                    historyCity.toLowerCase()
                    !==
                    city.toLowerCase()
                );

            }
        );


    // Add the newest search to the beginning.
    searchHistory.unshift(
        city
    );


    // Keep only the most recent 10 cities.
    searchHistory =
        searchHistory.slice(
            0,
            MAX_HISTORY_ITEMS
        );


    // Save to localStorage.
    saveSearchHistory();


    // Update the displayed history.
    displaySearchHistory();

}


// Save search history array.
function saveSearchHistory() {

    localStorage.setItem(

        STORAGE_KEYS.history,

        JSON.stringify(
            searchHistory
        )

    );

}


// Display clickable history buttons.
function displaySearchHistory() {

    // Clear old buttons.
    searchHistoryElement.innerHTML =
        "";


    // Create one button for each city.
    searchHistory.forEach(
        function(city) {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.classList.add(
                "history-btn"
            );


            button.textContent =
                city;


            // Clicking the history button
            // searches that city again.
            button.addEventListener(
                "click",
                function() {

                    cityInput.value =
                        city;


                    fetchWeather(
                        city
                    );

                }
            );


            searchHistoryElement.appendChild(
                button
            );

        }
    );


    // Update autocomplete suggestions too.
    updateAutocompleteSuggestions();

}


// Remove all search history.
function clearSearchHistory() {

    // Empty the array.
    searchHistory = [];


    // Remove saved history.
    localStorage.removeItem(
        STORAGE_KEYS.history
    );


    // Refresh the displayed buttons.
    displaySearchHistory();

}


// ============================================================
// 12. SEARCH HISTORY AUTOCOMPLETE
// ============================================================
//
// The assignment requests autocomplete suggestions
// based on the last 10 searches.
//
// We create a <datalist> dynamically so you do not
// need to modify index.html.
//

function updateAutocompleteSuggestions() {

    let dataList =
        document.getElementById(
            "city-suggestions"
        );


    // If the datalist does not exist yet,
    // create it.
    if (!dataList) {

        dataList =
            document.createElement(
                "datalist"
            );


        dataList.id =
            "city-suggestions";


        document.body.appendChild(
            dataList
        );


        // Connect the city input
        // to the datalist.
        cityInput.setAttribute(
            "list",
            "city-suggestions"
        );

    }


    // Remove old suggestions.
    dataList.innerHTML =
        "";


    // Add current history as suggestions.
    searchHistory.forEach(
        function(city) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                city;


            dataList.appendChild(
                option
            );

        }
    );

}


// ============================================================
// 13. LOADING AND ERROR FUNCTIONS
// ============================================================

function showLoading() {

    // Display the loading message.
    loadingElement.classList.remove(
        "hidden"
    );


    // Hide previous content while
    // the new city is loading.
    currentWeatherSection.classList.add(
        "hidden"
    );


    forecastSection.classList.add(
        "hidden"
    );

}


function hideLoading() {

    loadingElement.classList.add(
        "hidden"
    );

}


function showError(message) {

    // Add message text.
    errorMessageElement.textContent =
        message;


    // Display error.
    errorMessageElement.classList.remove(
        "hidden"
    );


    // Hide weather sections so the user
    // clearly sees the error state.
    currentWeatherSection.classList.add(
        "hidden"
    );


    forecastSection.classList.add(
        "hidden"
    );

}


function hideError() {

    errorMessageElement.textContent =
        "";


    errorMessageElement.classList.add(
        "hidden"
    );

}


// ============================================================
// 14. OPTIONAL WEATHER CACHE
// ============================================================
//
// This helps towards the assignment's
// offline-mode bonus.
//
// The latest successful API response is stored
// in localStorage.
//

function saveWeatherCache(
    weatherData,
    forecastData
) {

    const cache = {

        weather:
            weatherData,

        forecast:
            forecastData,

        timestamp:
            Date.now()

    };


    localStorage.setItem(

        STORAGE_KEYS.cache,

        JSON.stringify(cache)

    );

}


// Load the most recent cached weather.
function loadCachedWeather() {

    const cachedData =
        localStorage.getItem(
            STORAGE_KEYS.cache
        );


    // No cached data exists.
    if (!cachedData) {

        return false;

    }


    try {

        const cache =
            JSON.parse(
                cachedData
            );


        // Restore application state.
        currentWeatherData =
            cache.weather;


        currentForecastData =
            cache.forecast;


        // Display cached weather.
        displayCurrentWeather(
            currentWeatherData
        );


        displayForecast(
            currentForecastData
        );


        // Calculate how old the cached data is.
        const minutesOld =
            Math.floor(

                (
                    Date.now()
                    -
                    cache.timestamp
                )

                / 60000

            );


        // Display a notice.
        errorMessageElement.textContent =
            `Offline mode: showing cached weather. Last updated ${minutesOld} minute${minutesOld === 1 ? "" : "s"} ago.`;


        errorMessageElement.classList.remove(
            "hidden"
        );


        return true;


    } catch (error) {

        console.error(
            "Could not load weather cache:",
            error
        );


        return false;

    }

}


// ============================================================
// 15. OPTIONAL DYNAMIC WEATHER BACKGROUND
// ============================================================
//
// This function adds a weather-related class
// to <body>.
//
// You can style these classes in CSS later:
//
// .weather-clear
// .weather-cloudy
// .weather-rain
// .weather-snow
// .weather-storm
// .weather-night
//

function updateWeatherBackground(
    weatherCondition,
    iconCode
) {

    // Remove previous weather classes.
    document.body.classList.remove(

        "weather-clear",

        "weather-cloudy",

        "weather-rain",

        "weather-snow",

        "weather-storm",

        "weather-night"

    );


    // OpenWeatherMap icons ending in "n"
    // represent nighttime.
    const isNight =
        iconCode.endsWith("n");


    if (isNight) {

        document.body.classList.add(
            "weather-night"
        );

        return;
    }


    // Apply class based on condition.
    switch (
        weatherCondition.toLowerCase()
    ) {

        case "clear":

            document.body.classList.add(
                "weather-clear"
            );

            break;


        case "clouds":

            document.body.classList.add(
                "weather-cloudy"
            );

            break;


        case "rain":

        case "drizzle":

            document.body.classList.add(
                "weather-rain"
            );

            break;


        case "snow":

            document.body.classList.add(
                "weather-snow"
            );

            break;


        case "thunderstorm":

            document.body.classList.add(
                "weather-storm"
            );

            break;


        default:

            // No special class required.
            break;

    }

}


// ============================================================
// 16. EVENT LISTENERS
// ============================================================

// Search form submission.
//
// Because we use a form, this works when:
//
// 1. User clicks Search
// 2. User presses Enter
searchForm.addEventListener(
    "submit",
    function(event) {

        // Stop the browser from refreshing.
        event.preventDefault();


        // Read the city entered by the user.
        const city =
            cityInput.value.trim();


        // Search weather.
        fetchWeather(
            city
        );

    }
);


// Celsius button.
celsiusButton.addEventListener(
    "click",
    function() {

        changeUnit(
            "C"
        );

    }
);


// Fahrenheit button.
fahrenheitButton.addEventListener(
    "click",
    function() {

        changeUnit(
            "F"
        );

    }
);


// Clear search history.
clearHistoryButton.addEventListener(
    "click",
    function() {

        clearSearchHistory();

    }
);


// ============================================================
// 17. INITIALISE APPLICATION
// ============================================================

function initializeApp() {

    // Set Celsius / Fahrenheit button
    // according to saved preference.
    updateUnitButtons();


    // Display saved search history.
    displaySearchHistory();


    // Make sure loading and error
    // messages start hidden.
    hideLoading();

    hideError();


    console.log(
        "WeatherNow application initialized."
    );

}


// Start the application after
// the JavaScript file loads.
initializeApp();