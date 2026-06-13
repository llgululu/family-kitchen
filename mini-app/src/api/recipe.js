import { http } from './http.js';

export const recipeApi = {
  list(params = {}) {
    const query = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') query[k] = v;
    }
    if (Array.isArray(query.mealTags)) query.mealTags = query.mealTags.join(',');
    if (Array.isArray(query.flavorTags)) query.flavorTags = query.flavorTags.join(',');
    return http.get('/recipes', query);
  },
  random() {
    return http.get('/recipes/random');
  },
  get(id) {
    return http.get(`/recipes/${id}`);
  },
  create(data) {
    return http.post('/recipes', data);
  },
  update(id, data) {
    return http.patch(`/recipes/${id}`, data);
  },
  remove(id) {
    return http.delete(`/recipes/${id}`);
  },
  favorite(id) {
    return http.post(`/recipes/${id}/favorite`);
  },
  unfavorite(id) {
    return http.delete(`/recipes/${id}/favorite`);
  },
};
