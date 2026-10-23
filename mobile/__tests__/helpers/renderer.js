const path = require('path');
module.exports = require(require.resolve('react-test-renderer', { paths: [path.dirname(require.resolve('@testing-library/react-native'))] }));
