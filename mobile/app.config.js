const base = require('./app.json');
const EAS_PROJECT_ID = '0e27df85-2a2b-4246-8305-f4490db28bbb';

module.exports = ({ config }) => ({
  ...base.expo,
  ...config,
  extra: {
    ...(base.expo.extra || {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || EAS_PROJECT_ID,
    },
  },
});
