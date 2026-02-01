const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// PORT dinamis
const PORT = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*', // Untuk local test, nanti restrict saat production
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Config
const COC_API_KEY = process.env.COC_API_KEY || process.env.REACT_APP_COC_API_KEY;
const CLAN_TAG_RAW = process.env.CLAN_TAG || process.env.REACT_APP_CLAN_TAG || '2Y29VCP89';
const CLAN_TAG = CLAN_TAG_RAW.startsWith('#') ? CLAN_TAG_RAW : '#' + CLAN_TAG_RAW;

if (!COC_API_KEY) {
  console.error('❌ ERROR: COC_API_KEY tidak ditemukan di .env!');
  process.exit(1);
}

console.log('✅ Config loaded:');
console.log('   Clan Tag:', CLAN_TAG);
console.log('   API Key:', COC_API_KEY.substring(0, 20) + '...');

// Helper fetch ke CoC API
async function fetchCoC(endpoint) {
  const url = `https://api.clashofclans.com/v1/${endpoint}`; // FIX: Tidak ada spasi
  console.log('Fetching:', url);
  
  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${COC_API_KEY}`,
      'Accept': 'application/json'
    },
    timeout: 10000
  });
  return response.data;
}

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.json({ 
    status: '✅ ONLINE', 
    service: 'Pendragon CoC Proxy',
    clanTag: CLAN_TAG,
    timestamp: new Date().toISOString()
  });
});

// ========== CLAN ENDPOINTS ==========

// 1. Get Clan Info
app.get('/clan', async (req, res) => {
  try {
    const data = await fetchCoC(`clans/${encodeURIComponent(CLAN_TAG)}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

// 2. List Members
app.get('/members', async (req, res) => {
  try {
    const data = await fetchCoC(`clans/${encodeURIComponent(CLAN_TAG)}/members`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. War Log
app.get('/warlog', async (req, res) => {
  try {
    const data = await fetchCoC(`clans/${encodeURIComponent(CLAN_TAG)}/warlog`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Current War
app.get('/currentwar', async (req, res) => {
  try {
    const data = await fetchCoC(`clans/${encodeURIComponent(CLAN_TAG)}/currentwar`);
    res.json({ success: true, data });
  } catch (error) {
    if (error.response?.status === 404) {
      return res.json({ success: true, data: { state: 'notInWar' } });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. Clan War League Group
app.get('/cwl/group', async (req, res) => {
  try {
    const data = await fetchCoC(`clans/${encodeURIComponent(CLAN_TAG)}/currentwar/leaguegroup`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Capital Raid Seasons
app.get('/capital/raids', async (req, res) => {
  try {
    const data = await fetchCoC(`clans/${encodeURIComponent(CLAN_TAG)}/capitalraidseasons`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. Search Clans (with query params)
app.get('/clans/search', async (req, res) => {
  try {
    // Bisa pakai query: ?name=pendragon&minMembers=10
    const queryParams = new URLSearchParams(req.query).toString();
    const endpoint = `clans${queryParams ? '?' + queryParams : ''}`;
    const data = await fetchCoC(endpoint);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PLAYER ENDPOINTS ==========

// 8. Get Player Info
app.get('/player/:tag', async (req, res) => {
  try {
    let tag = req.params.tag;
    if (!tag.startsWith('#')) tag = '#' + tag;
    
    const data = await fetchCoC(`players/${encodeURIComponent(tag)}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 9. Verify Player Token (POST)
app.post('/player/:tag/verifytoken', async (req, res) => {
  try {
    let tag = req.params.tag;
    if (!tag.startsWith('#')) tag = '#' + tag;
    
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token required' });
    }

    const url = `https://api.clashofclans.com/v1/players/${encodeURIComponent(tag)}/verifytoken`;
    const response = await axios.post(url, { token }, {
      headers: {
        'Authorization': `Bearer ${COC_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== CWL WAR ENDPOINTS ==========

// 10. Get Specific CWL War
app.get('/cwl/war/:warTag', async (req, res) => {
  try {
    const warTag = req.params.warTag;
    const data = await fetchCoC(`clanwarleagues/wars/${encodeURIComponent(warTag)}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== LEAGUE ENDPOINTS ==========

// 11. List Leagues
app.get('/leagues', async (req, res) => {
  try {
    const data = await fetchCoC('leagues');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 12. Get League Info
app.get('/leagues/:leagueId', async (req, res) => {
  try {
    const data = await fetchCoC(`leagues/${req.params.leagueId}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 13. Get League Seasons
app.get('/leagues/:leagueId/seasons', async (req, res) => {
  try {
    const data = await fetchCoC(`leagues/${req.params.leagueId}/seasons`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 14. Get League Season Rankings
app.get('/leagues/:leagueId/seasons/:seasonId', async (req, res) => {
  try {
    const { leagueId, seasonId } = req.params;
    const data = await fetchCoC(`leagues/${leagueId}/seasons/${seasonId}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== WAR LEAGUE ENDPOINTS ==========

// 15. List War Leagues
app.get('/warleagues', async (req, res) => {
  try {
    const data = await fetchCoC('warleagues');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 16. Get War League Info
app.get('/warleagues/:leagueId', async (req, res) => {
  try {
    const data = await fetchCoC(`warleagues/${req.params.leagueId}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== CAPITAL LEAGUE ENDPOINTS ==========

// 17. List Capital Leagues
app.get('/capitalleagues', async (req, res) => {
  try {
    const data = await fetchCoC('capitalleagues');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 18. Get Capital League Info
app.get('/capitalleagues/:leagueId', async (req, res) => {
  try {
    const data = await fetchCoC(`capitalleagues/${req.params.leagueId}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== BUILDER BASE LEAGUE ENDPOINTS ==========

// 19. List Builder Base Leagues
app.get('/builderbaseleagues', async (req, res) => {
  try {
    const data = await fetchCoC('builderbaseleagues');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 20. Get Builder Base League Info
app.get('/builderbaseleagues/:leagueId', async (req, res) => {
  try {
    const data = await fetchCoC(`builderbaseleagues/${req.params.leagueId}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== LEAGUE TIER ENDPOINTS ==========

// 21. List League Tiers
app.get('/leaguetiers', async (req, res) => {
  try {
    const data = await fetchCoC('leaguetiers');
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 22. Get League Tier Info
app.get('/leaguetiers/:tierId', async (req, res) => {
  try {
    const data = await fetchCoC(`leaguetiers/${req.params.tierId}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 PENDRAGON PROXY v1.0 READY        ║
║  Port: ${PORT}                            ║
╚════════════════════════════════════════╝

Endpoints:
Clan:     /clan, /members, /warlog, /currentwar, /cwl/group, /capital/raids
Player:   /player/:tag, /player/:tag/verifytoken (POST)
Leagues:  /leagues, /leagues/:id, /leagues/:id/seasons
War:      /cwl/war/:warTag, /warleagues
Capital:  /capitalleagues
Builder:  /builderbaseleagues
Tiers:    /leaguetiers

Test: http://localhost:${PORT}/health
  `);
});