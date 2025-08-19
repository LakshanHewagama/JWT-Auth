const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test access token in cookies
const testAccessTokenCookies = async () => {
  try {
    console.log('🍪 Testing Access Token Cookies...\n');

    // Step 1: Login and check if both tokens are set
    console.log('1️⃣ Logging in to check cookie behavior...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    }, {
      withCredentials: true
    });

    console.log('✅ Login successful');
    
    // Check cookies from response headers
    const cookies = loginResponse.headers['set-cookie'];
    console.log('🍪 Cookies set by server:');
    if (cookies) {
      cookies.forEach(cookie => {
        if (cookie.includes('accessToken')) {
          console.log('   ✅ Access Token Cookie:', cookie.split(';')[0]);
        }
        if (cookie.includes('refreshToken')) {
          console.log('   ✅ Refresh Token Cookie:', cookie.split(';')[0]);
        }
      });
    } else {
      console.log('   ❌ No cookies found in response headers');
    }

    // Step 2: Make request to admin dashboard using cookies only (no Authorization header)
    console.log('\n2️⃣ Testing admin access with cookies only...');
    
    try {
      const dashboardResponse = await axios.get(`${BASE_URL}/admin/dashboard`, {
        withCredentials: true
        // Note: No Authorization header - should use cookie
      });

      console.log('✅ Admin dashboard accessed successfully using cookies!');
      console.log('📊 Total Users:', dashboardResponse.data.data.overview.totalUsers);
      console.log('👥 Active Users:', dashboardResponse.data.data.overview.activeUsers);
    } catch (error) {
      console.log('❌ Admin access failed with cookies only');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message);
      
      // Try with Authorization header as fallback
      console.log('\n3️⃣ Trying with Authorization header...');
      const authResponse = await axios.get(`${BASE_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${loginResponse.data.data.accessToken}`
        },
        withCredentials: true
      });
      console.log('✅ Admin dashboard accessed with Authorization header');
    }

    // Step 3: Test logout
    console.log('\n4️⃣ Testing logout...');
    const logoutResponse = await axios.post(`${BASE_URL}/auth/logout`, {}, {
      withCredentials: true
    });

    console.log('✅ Logout successful:', logoutResponse.data.message);

    // Step 4: Try to access admin dashboard after logout (should fail)
    console.log('\n5️⃣ Testing access after logout...');
    try {
      await axios.get(`${BASE_URL}/admin/dashboard`, {
        withCredentials: true
      });
      console.log('❌ ERROR: Should not have access after logout!');
    } catch (error) {
      console.log('✅ Correctly denied access after logout');
      console.log('   Status:', error.response?.status);
      console.log('   Message:', error.response?.data?.message);
    }

    console.log('\n🎉 Cookie test completed!');

  } catch (error) {
    console.error('❌ Error testing cookies:', error.response?.data || error.message);
  }
};

// Run the test
testAccessTokenCookies();
