const express = require('express');
require('dotenv').config();

console.log('Booting server.js');

const app = express();
const PORT = 3000;

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const CURRENCY_API_KEY = process.env.CURRENCY_API_KEY;

const fetchFn = global.fetch
  ? global.fetch.bind(global)
  : (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

app.use(express.json());
app.use(express.static('public'));

app.get('/api/weather', async (req, res) => {
  try {
    const city = req.query.city;
    if (!city) {
      return res.status(400).json({ error: 'city query param is required' });
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=ru`;

    const response = await fetchFn(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch weather' });
    }

    const data = await response.json();

    return res.status(200).json({
      city: data.name,
      coord: data.coord,
      temperature: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      wind_speed: data.wind.speed,
      country: data.sys.country,
      description: data.weather?.[0]?.description,
      icon: data.weather?.[0]?.icon,
      rain_3h: data.rain?.['3h'] || 0
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const country = req.query.country;
    const city = req.query.city;
    if (!country && !city) {
      return res.status(400).json({ error: 'country or city query param is required' });
    }

    const params = new URLSearchParams({
      api_token: NEWS_API_KEY,
      language: 'ru'
    });

    if (city) {
      params.append('search', city);
    }

    const url = `https://api.thenewsapi.com/v1/news/top?${params.toString()}`;

    const response = await fetchFn(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch news' });
    }

    const data = await response.json();

    const articles = (data.data || []).slice(0, 5).map(a => ({
      title: a.title,
      description: a.description,
      url: a.url,
      source: a.source,
      publishedAt: a.published_at
    }));

    return res.status(200).json({ total: articles.length, articles });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/currency', async (req, res) => {
  try {
    const base = req.query.base;
    const target = req.query.target;
    if (!base || !target) {
      return res.status(400).json({ error: 'base and target query params are required' });
    }

    const url = `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${CURRENCY_API_KEY}&base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}`;
    const response = await fetchFn(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch rates' });
    }

    const data = await response.json();

    const rate = data.rates?.[target.toUpperCase()];
    if (!rate) {
      return res.status(404).json({ error: 'Rate not found' });
    }

    return res.status(200).json({
      base: data.base,
      target: target.toUpperCase(),
      rate: Number(rate)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('Listen error:', err);
});


