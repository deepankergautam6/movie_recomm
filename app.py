from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import pickle
import requests
import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load precomputed model
try:
    with open('model/movie_list.pkl', 'rb') as f:
        merged_data = pd.read_pickle(f)
    with open('model/similarity.pkl', 'rb') as f:
        combined_sim = pickle.load(f)
    logger.info("Successfully loaded movie_list.pkl and similarity.pkl")
except FileNotFoundError as e:
    logger.error(f"Error loading pickle files: {e}")
    raise

def fetch_poster_path(movie_id):
    TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8'  # Updated API key
    url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={TMDB_API_KEY}&language=en-US"
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        return {
            'poster_path': data.get('poster_path'),
            'backdrop_path': data.get('backdrop_path')
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching poster for TMDB ID {movie_id}: {e}")
        return None

@app.route('/movies')
def get_movies():
    try:
        movies = merged_data['title'].dropna().tolist()
        logger.info(f"Returning {len(movies)} movie titles")
        return jsonify(movies)
    except Exception as e:
        logger.error(f"Error in /movies endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/movies/genre')
def get_movies_by_genre():
    try:
        genre = request.args.get('genre', '').strip()
        if not genre:
            logger.warning("Genre parameter missing in /movies/genre")
            return jsonify({'error': 'Genre parameter is required'}), 400

        movies = merged_data[merged_data['genres'].str.contains(genre, case=False, na=False)]
        movies = movies.sort_values(by='vote_average', ascending=False).head(10)

        movie_list = []
        for _, row in movies.iterrows():
            movie_id = row['movie_id']
            paths = fetch_poster_path(movie_id)
            if paths is None:
                logger.warning(f"Skipping movie {row['title']} (ID: {movie_id}) due to missing poster")
                continue

            movie_list.append({
                'movie_id': int(movie_id),
                'title': row['title'],
                'genres': row['genres'],
                'cast': row['cast'],
                'vote_average': float(row['vote_average']),
                'overview': row['overview'],
                'runtime': float(row['runtime']) if pd.notnull(row['runtime']) else None,
                'poster_path': paths['poster_path'],
                'backdrop_path': paths['backdrop_path']
            })

        logger.info(f"Returning {len(movie_list)} movies for genre '{genre}'")
        return jsonify(movie_list)
    except Exception as e:
        logger.error(f"Error in /movies/genre endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/recommend') #Td-idf
def recommend():
    try:
        title = request.args.get('title', '').strip()
        if not title:
            logger.warning("Title parameter missing in /recommend")
            return jsonify({'error': 'Title parameter is required'}), 400

        movie_index = merged_data[merged_data['title'].str.lower() == title.lower()].index
        if len(movie_index) == 0:
            logger.warning(f"Movie '{title}' not found in /recommend")
            return jsonify({'error': 'Movie not found'}), 404

        idx = movie_index[0]
        sim_scores = list(enumerate(combined_sim[idx]))
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)[1:11]

        movie_list = []
        for idx, score in sim_scores:
            row = merged_data.iloc[idx]
            movie_id = row['movie_id']
            paths = fetch_poster_path(movie_id)
            if paths is None:
                logger.warning(f"Skipping movie {row['title']} (ID: {movie_id}) due to missing poster")
                continue

            movie_list.append({
                'movie_id': int(movie_id),
                'title': row['title'],
                'genres': row['genres'],
                'cast': row['cast'],
                'vote_average': float(row['vote_average']),
                'overview': row['overview'],
                'runtime': float(row['runtime']) if pd.notnull(row['runtime']) else None,
                'poster_path': paths['poster_path'],
                'backdrop_path': paths['backdrop_path'],
                'similarity_score': float(score) * 100  # Convert to percentage
            })

        logger.info(f"Returning {len(movie_list)} recommendations for '{title}'")
        return jsonify(movie_list)
    except Exception as e:
        logger.error(f"Error in /recommend endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/trending')
def get_trending_movies():
    try:
        trending_movies = merged_data.sort_values(by='vote_average', ascending=False).head(10)
        
        movie_list = []
        for _, row in trending_movies.iterrows():
            movie_id = row['movie_id']
            paths = fetch_poster_path(movie_id)
            if paths is None:
                logger.warning(f"Skipping movie {row['title']} (ID: {movie_id}) due to missing poster")
                continue

            movie_list.append({
                'movie_id': int(movie_id),
                'title': row['title'],
                'genres': row['genres'],
                'cast': row['cast'],
                'vote_average': float(row['vote_average']),
                'overview': row['overview'],
                'runtime': float(row['runtime']) if pd.notnull(row['runtime']) else None,
                'poster_path': paths['poster_path'],
                'backdrop_path': paths['backdrop_path']
            })

        logger.info(f"Returning {len(movie_list)} trending movies")
        return jsonify(movie_list)
    except Exception as e:
        logger.error(f"Error in /trending endpoint: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/favicon.ico')
def favicon():
    try:
        return send_from_directory(os.path.join(app.root_path, 'static'), 
                                 'favicon.ico', 
                                 mimetype='image/vnd.microsoft.icon')
    except Exception as e:
        logger.error(f"Error serving favicon: {e}")
        return '', 404

if __name__ == '__main__':
    app.run(debug=True)