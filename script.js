let currentFeaturedMovie = null;
let watchList = [];

async function getRecommendations() {
    const title = document.getElementById('movieTitle').value.trim();
    const resultsDiv = document.getElementById('results');
    if (!title) {
        resultsDiv.innerHTML = '<p>Please enter a movie title.</p>';
        return;
    }
    resultsDiv.innerHTML = '<div class="spinner"></div>';
    try {
        const response = await fetch(`http://localhost:5000/recommend?title=${encodeURIComponent(title)}`);
        const data = await response.json();
        if (data.error) {
            resultsDiv.innerHTML = `<p>${data.error}</p>`;
            return;
        }
        console.log('Recommendations:', data);
        displayMovies(data);
    } catch (error) {
        console.error('Error in getRecommendations:', error);
        resultsDiv.innerHTML = '<p>Error loading movies.</p>';
    }
}

async function getMoviesByGenre(genre) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<div class="spinner"></div>';
    try {
        const response = await fetch(`http://localhost:5000/movies/genre?genre=${encodeURIComponent(genre)}`);
        const data = await response.json();
        if (data.error) {
            resultsDiv.innerHTML = `<p>${data.error}</p>`;
            return;
        }
        console.log('Movies by genre:', data);
        displayMovies(data);
    } catch (error) {
        console.error('Error in getMoviesByGenre:', error);
        resultsDiv.innerHTML = '<p>Error loading movies.</p>';
    }
}

function displayMovies(movies) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = ''; // Clear previous content
    movies.forEach(movie => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';

        const img = document.createElement('img');
        img.src = movie.poster_path ? 'https://image.tmdb.org/t/p/w500' + movie.poster_path : 'https://via.placeholder.com/150x225?text=No+Poster';
        img.className = 'movie-poster';
        img.alt = movie.title || 'Movie Poster';

        // Single click to show movie details
        img.addEventListener('click', () => {
            console.log('Movie data before stringifying:', movie);
            showMovieDetails(JSON.stringify(movie));
        });

        // Double click to play trailer
        img.addEventListener('dblclick', () => {
            playTrailer(movie.movie_id);
        });

        const titleDiv = document.createElement('div');
        titleDiv.className = 'movie-title';
        titleDiv.textContent = movie.title || 'Unknown Title';

        movieCard.appendChild(img);
        movieCard.appendChild(titleDiv);
        resultsDiv.appendChild(movieCard);
    });
}

async function showMovieDetails(movieStr) {
    try {
        console.log('Received movieStr:', movieStr);
        const movie = JSON.parse(movieStr);
        console.log('Parsed movie object:', movie);
        currentFeaturedMovie = movie;

        // Update hero section with fallback values
        document.getElementById('heroTitle').innerText = movie.title || 'Unknown Title';
        document.getElementById('heroOverview').innerText = movie.overview || 'No summary available.';
        document.getElementById('heroDuration').innerText = movie.runtime ? `${movie.runtime} min` : 'Duration: N/A';
        document.getElementById('heroRating').innerText = movie.vote_average ? `${movie.vote_average}/10` : 'Rating: N/A';

        // Set hero background image using backdrop_path
        const hero = document.getElementById('hero');
        if (movie.backdrop_path) {
            hero.style.backgroundImage = `url('https://image.tmdb.org/t/p/w1280${movie.backdrop_path}')`;
            hero.style.backgroundSize = 'cover';
            hero.style.backgroundPosition = 'center';
        } else {
            hero.style.backgroundImage = 'none';
        }

        // Set hero poster image using poster_path
        const heroPoster = document.getElementById('heroPoster');
        if (movie.poster_path) {
            heroPoster.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
            heroPoster.alt = movie.title || 'Movie Poster';
            heroPoster.style.display = 'block'; // Make the poster visible
        } else {
            heroPoster.src = 'https://via.placeholder.com/300x450?text=No+Poster';
            heroPoster.alt = 'No Poster Available';
            heroPoster.style.display = 'block';
        }

        console.log('currentFeaturedMovie set to:', currentFeaturedMovie);
    } catch (error) {
        console.error('Error in showMovieDetails:', error.message, error.stack);
        alert('Error loading movie details. Check console for details.');
    }
}

async function playTrailer(movieId) {
    console.log('Attempting to play trailer for movie ID:', movieId);
    const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
        console.log('TMDB API response status:', response.status);
        if (!response.ok) {
            console.error('TMDB API error:', response.status, response.statusText);
            throw new Error(`TMDB API error: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        console.log('TMDB API video data:', data);

        const trailer = data.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
        if (trailer) {
            const trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
            console.log('Trailer found, opening URL:', trailerUrl);
            window.open(trailerUrl, '_blank');
        } else {
            console.log('No trailer found for movie ID:', movieId);
            alert('No trailer available for this movie.');
        }
    } catch (error) {
        console.error('Error fetching trailer in playTrailer:', error.message);
        alert('Error loading trailer. Check console for details.');
    }
}

async function playMovie() {
    if (!currentFeaturedMovie) {
        console.log('No movie selected for playMovie.');
        alert('Please select a movie first.');
        return;
    }

    console.log('Attempting to play trailer for movie ID:', currentFeaturedMovie.movie_id);
    const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${currentFeaturedMovie.movie_id}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
        console.log('TMDB API response status:', response.status);
        if (!response.ok) {
            console.error('TMDB API error:', response.status, response.statusText);
            throw new Error(`TMDB API error: ${response.status} - ${response.statusText}`);
        }
        const data = await response.json();
        console.log('TMDB API video data:', data);

        const trailer = data.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
        if (trailer) {
            const trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
            console.log('Trailer found, opening URL:', trailerUrl);
            window.open(trailerUrl, '_blank');
        } else {
            console.log('No trailer found for:', currentFeaturedMovie.title);
            alert(`No trailer available for "${currentFeaturedMovie.title}"`);
        }
    } catch (error) {
        console.error('Error fetching trailer in playMovie:', error.message);
        alert('Error loading trailer. Check console for details.');
    }
}

function addToList() {
    if (currentFeaturedMovie && !watchList.some(movie => movie.movie_id === currentFeaturedMovie.movie_id)) {
        watchList.push(currentFeaturedMovie);
        localStorage.setItem('watchList', JSON.stringify(watchList));
        console.log('Watch list:', watchList);
        alert(`${currentFeaturedMovie.title} added to your watch list!`);
    } else if (currentFeaturedMovie) {
        alert(`${currentFeaturedMovie.title} is already in your watch list!`);
    } else {
        alert('Please select a movie first.');
    }
}

function showWatchList() {
    const resultsDiv = document.getElementById('results');
    if (watchList.length == 0) {
        resultsDiv.innerHTML = '<p>Your watch list is empty.</p>';
        return;
    }
    displayMovies(watchList);
}

async function autocomplete() {
    const input = document.getElementById('movieTitle');
    const autocompleteList = document.getElementById('autocompleteList');
    const response = await fetch('http://localhost:5000/movies');
    const movies = await response.json();

    input.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        autocompleteList.innerHTML = '';
        autocompleteList.style.display = 'none';

        if (value) {
            const filtered = movies.filter(movie => movie.toLowerCase().includes(value)).slice(0, 10);
            if (filtered.length > 0) {
                autocompleteList.style.display = 'block';
                filtered.forEach(movie => {
                    const div = document.createElement('div');
                    div.textContent = movie;
                    div.addEventListener('click', () => {
                        input.value = movie;
                        autocompleteList.innerHTML = '';
                        autocompleteList.style.display = 'none';
                        getRecommendations();
                    });
                    autocompleteList.appendChild(div);
                });
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.style.display = 'none';
        }
    });
}

window.onload = function() {
    getMoviesByGenre('Action');
    watchList = JSON.parse(localStorage.getItem('watchList')) || [];
    autocomplete();
};