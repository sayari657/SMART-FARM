const fs = require('fs');

const file = 'frontend/src/pages/Settings.jsx';
let content = fs.readFileSync(file, 'utf8');

// The file already imports useTranslation and uses t('settings.title')
content = content.replace("const SECTION_MAP = {", "const SECTION_MAP = (t) => ({\n  [t('settings.bee_thresholds')]: ['bee_temp_max','bee_humidity_min','bee_weight_drop_alert'],\n  [t('settings.cow_thresholds')]: ['cow_temp_max'],\n  [t('settings.poultry_thresholds')]: ['poultry_ammonia_max','poultry_temp_max'],\n  [t('common.system')]: ['alert_check_interval_sec'],\n});");
content = content.replace("Object.entries(SECTION_MAP).map", "Object.entries(SECTION_MAP(t)).map");
content = content.replace("t('common.save')", "t('common.saved_success') || 'Saved'");
content = content.replace("<div className=\"alert-banner-msg\">✓ {t('common.saved_success') || 'Saved'}</div>", "<div className=\"alert-banner-msg\">✓ {t('common.saved_success') || 'Saved'}</div>");

fs.writeFileSync(file, content, 'utf8');
console.log('done');
