Package.describe({
  summary: "Reload the page while preserving application state.",
  version: '1.1.11-rc.3'
});

Package.onUse(function (api) {
  api.use(['underscore', 'ecmascript-runtime'], 'client');
  api.export('Reload', 'client');
  api.addFiles('reload.js', 'client');
  api.addFiles('deprecated.js', 'client');
});

Package.onTest(function (api) {
  api.use(['tinytest', 'reload'], 'client');
  api.addFiles('reload_tests.js', 'client');
});
