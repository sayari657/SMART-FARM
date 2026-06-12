import os

def patch_file(filepath, replacements):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    modified = False
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new)
            modified = True
        else:
            print(f"Pattern not found in {filepath}: {old[:30]}...")

    if modified:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Successfully patched {filepath}")

# 1. Patch AboutBee.jsx
bee_replacements = [
    (
        "const NAV_TABS = [", 
        "// We will translate these inline in the component later if needed, but for now we patch the text\nconst NAV_TABS = ["
    ),
    (
        "label: \"Vue d'ensemble\"", "label: t('bee.tabs.dashboard', \"Vue d'ensemble\")"
    ),
    (
        "label: 'Sites GIS'", "label: t('bee.tabs.sites', 'Sites GIS')"
    ),
    (
        "label: 'Inventaire'", "label: t('bee.tabs.inventaire', 'Inventaire')"
    ),
    (
        "label: 'Inspections'", "label: t('bee.tabs.visites', 'Inspections')"
    ),
    (
        "label: 'Production'", "label: t('bee.tabs.production', 'Production')"
    ),
    (
        "label: 'Stock'", "label: t('bee.tabs.stock', 'Stock')"
    ),
    (
        "label: 'Missions'", "label: t('bee.tabs.missions', 'Missions')"
    ),
    (
        "label: 'Analytics IA'", "label: t('bee.tabs.analytics', 'Analytics IA')"
    ),
    (
        "label: 'Mode Terrain'", "label: t('bee.tabs.terrain', 'Mode Terrain')"
    ),
    (
        "export default function AboutBee() {",
        "import { useTranslation } from 'react-i18next';\nexport default function AboutBee() {\n  const { t } = useTranslation();"
    ),
    (
        "<div style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>Mode Terrain</div>",
        "<div style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>{t('bee.terrain.title', 'Mode Terrain')}</div>"
    ),
    (
        "<div style={{ fontWeight: 700 }}>Aucune ruche active</div>",
        "<div style={{ fontWeight: 700 }}>{t('bee.terrain.no_hive', 'Aucune ruche active')}</div>"
    )
]

# Note: We must ensure NAV_TABS can access `t` if it's defined outside the component.
# Actually, if NAV_TABS is defined OUTSIDE the component in AboutBee.jsx, `t` won't be in scope.
# Let's fix that by moving NAV_TABS inside, or changing NAV_TABS to a function or using inline translations inside the map.
# Let's redefine how we patch AboutBee.jsx.
