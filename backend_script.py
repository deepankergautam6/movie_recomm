import pandas as pd
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
import os
import json

# Load and merge datasets
movies = pd.read_csv('tmdb_5000_movies.csv')
credits = pd.read_csv('tmdb_5000_credits.csv')

movies.rename(columns={'id': 'movie_id'}, inplace=True)
merged_data = pd.merge(movies, credits, on='movie_id', suffixes=('_movies', '_credits'))
merged_data = merged_data.drop(columns=['title_credits'])
merged_data = merged_data.rename(columns={'title_movies': 'title'})
merged_data.fillna({'overview': '', 'genres': '', 'cast': ''}, inplace=True)

# Process genres and cast
def parse_genres(x):
    if x and x.strip():
        try:
            genres = json.loads(x)
            return ' '.join([genre['name'] for genre in genres])
        except:
            return ''
    return ''

def parse_cast(x):
    if x and x.strip():
        try:
            cast = json.loads(x)
            return ' '.join([member['name'] for member in cast[:3]])
        except:
            return ''
    return ''

merged_data['genres'] = merged_data['genres'].apply(parse_genres)
merged_data['cast'] = merged_data['cast'].apply(parse_cast)

# Create TF-IDF matrices
tfidf_overview = TfidfVectorizer(stop_words='english')
tfidf_genres = TfidfVectorizer(stop_words='english')
tfidf_cast = TfidfVectorizer(stop_words='english')

overview_matrix = tfidf_overview.fit_transform(merged_data['overview'])
genres_matrix = tfidf_genres.fit_transform(merged_data['genres'])
cast_matrix = tfidf_cast.fit_transform(merged_data['cast'])

# Compute similarity scores
overview_sim = linear_kernel(overview_matrix, overview_matrix)
genres_sim = linear_kernel(genres_matrix, genres_matrix)
cast_sim = linear_kernel(cast_matrix, cast_matrix)

combined_sim = 0.1 * overview_sim + 0.6 * genres_sim + 0.3 * cast_sim

# Save the files
os.makedirs('model', exist_ok=True)
merged_data.to_pickle('model/movie_list.pkl')
with open('model/similarity.pkl', 'wb') as f:
    pickle.dump(combined_sim, f)
with open('model/tfidf_overview.pkl', 'wb') as f:
    pickle.dump(tfidf_overview, f)
with open('model/tfidf_genres.pkl', 'wb') as f:
    pickle.dump(tfidf_genres, f)
with open('model/tfidf_cast.pkl', 'wb') as f:
    pickle.dump(tfidf_cast, f)

print("Files saved in 'model' folder!")