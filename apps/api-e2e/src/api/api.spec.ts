import axios from 'axios';

describe('GET /api', () => {
  it('should return health metadata', async () => {
    const res = await axios.get(`/api`);

    expect(res.status).toBe(200);
    expect(res.data).toMatchObject({ status: 'ok', service: 'islandhub-api', mode: 'seed' });
  });

  it('should create a today route from a spot', async () => {
    const res = await axios.post('/api/routes/today', { spotId: 'geysir' });

    expect(res.status).toBe(201);
    expect(res.data.today).toMatchObject({ title: 'Geysir out-and-back', stopProgress: '0/1' });
  });
});
