// clearDatabase.js
const User = require('../models/User');
const Token = require('../models/Token');
const { connectDB, disconnectDB } = require('./database');

// Clear all users and tokens from database
const clearDatabase = async () => {
  console.log('Clearing database...');

  const usersBefore = await User.countDocuments();
  const tokensBefore = await Token.countDocuments();
  console.log(`Before -> Users: ${usersBefore}, Tokens: ${tokensBefore}`);

  const deletedUsers = await User.deleteMany({});
  const deletedTokens = await Token.deleteMany({});
  console.log(`Deleted -> Users: ${deletedUsers.deletedCount}, Tokens: ${deletedTokens.deletedCount}`);

  const usersAfter = await User.countDocuments();
  const tokensAfter = await Token.countDocuments();
  console.log(`After  -> Users: ${usersAfter}, Tokens: ${tokensAfter}`);
};

// Run standalone
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await clearDatabase();
    } catch (e) {
      console.error('Error clearing database:', e.message);
      process.exit(1);
    } finally {
      await disconnectDB();
    }
  })();
}

module.exports = clearDatabase;
