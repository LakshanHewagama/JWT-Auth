const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Test admin dashboard functionality
const testAdminDashboard = async () => {
  try {
    console.log('🔐 Testing Admin Dashboard Flow...\n');

    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    }, {
      withCredentials: true
    });

    console.log('✅ Admin login successful');
    console.log('Admin user:', loginResponse.data.data.user);
    
    // Extract access token from response
    const accessToken = loginResponse.data.data.accessToken;
    console.log('🔑 Access token received\n');

    // Step 2: Access admin dashboard
    console.log('2️⃣ Accessing admin dashboard...');
    const dashboardResponse = await axios.get(`${BASE_URL}/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      withCredentials: true
    });

    console.log('✅ Dashboard data retrieved:');
    console.log('📊 Overview:', dashboardResponse.data.data.overview);
    console.log('📈 User Stats:', dashboardResponse.data.data.userStats);
    console.log('👥 Recent Users Count:', dashboardResponse.data.data.recentUsers.length);
    console.log('🖥️ System Info:', {
      environment: dashboardResponse.data.data.systemInfo.environment,
      nodeVersion: dashboardResponse.data.data.systemInfo.nodeVersion,
      uptime: Math.round(dashboardResponse.data.data.systemInfo.uptime) + 's'
    });
    console.log();

    // Step 3: Get all users
    console.log('3️⃣ Getting all users...');
    const usersResponse = await axios.get(`${BASE_URL}/admin/users?limit=5`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      withCredentials: true
    });

    console.log('✅ Users retrieved:');
    usersResponse.data.data.users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.fullName || user.firstName + ' ' + user.lastName} (${user.email}) - ${user.role} - ${user.isActive ? 'Active' : 'Inactive'}`);
    });
    console.log('📄 Pagination:', usersResponse.data.data.pagination);
    console.log();

    // Step 4: Get system stats
    console.log('4️⃣ Getting system statistics...');
    const statsResponse = await axios.get(`${BASE_URL}/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      withCredentials: true
    });

    console.log('✅ System stats retrieved:');
    console.log('💾 Database:', statsResponse.data.data.database);
    console.log('👥 Users by Role:', statsResponse.data.data.usersByRole);
    console.log();

    // Step 5: Test regular user access (should fail)
    console.log('5️⃣ Testing regular user access...');
    const userLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'john@test.com',
      password: 'user123'
    }, {
      withCredentials: true
    });

    const userAccessToken = userLoginResponse.data.data.accessToken;
    
    try {
      await axios.get(`${BASE_URL}/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${userAccessToken}`
        },
        withCredentials: true
      });
      console.log('❌ ERROR: Regular user should not have access to admin dashboard!');
    } catch (error) {
      console.log('✅ Regular user correctly denied access to admin dashboard');
      console.log('   Status:', error.response.status);
      console.log('   Message:', error.response.data.message);
    }

    console.log('\n🎉 Admin Dashboard Test Complete!');
    console.log('\n📋 Available Admin Endpoints:');
    console.log('   GET  /api/v1/admin/dashboard  - Main dashboard data');
    console.log('   GET  /api/v1/admin/users      - List all users (with pagination)');
    console.log('   GET  /api/v1/admin/users/:id  - Get specific user');
    console.log('   PATCH /api/v1/admin/users/:id/role   - Update user role');
    console.log('   PATCH /api/v1/admin/users/:id/status - Toggle user status');
    console.log('   DELETE /api/v1/admin/users/:id       - Deactivate user');
    console.log('   GET  /api/v1/admin/stats      - System statistics');

  } catch (error) {
    console.error('❌ Error testing admin dashboard:', error.response?.data || error.message);
  }
};

// Run the test
testAdminDashboard();
