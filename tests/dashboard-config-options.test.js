'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const configFlowPath = path.join(__dirname, '../custom_components/menstruation_cycle/config_flow.py');
const stringsPath = path.join(__dirname, '../custom_components/menstruation_cycle/strings.json');
const initPath = path.join(__dirname, '../custom_components/menstruation_cycle/__init__.py');

const configFlow = fs.readFileSync(configFlowPath, 'utf8');
const strings = JSON.parse(fs.readFileSync(stringsPath, 'utf8'));
const initPy = fs.readFileSync(initPath, 'utf8');

assert.ok(configFlow.includes('CONF_SHOW_CYCLE_DASHBOARD'));
assert.ok(configFlow.includes('CONF_CYCLE_DASHBOARD_DEFAULT_PAGE'));
assert.ok(configFlow.includes('CONF_DASHBOARD_ENABLED'));
assert.ok(configFlow.includes('CONF_DASHBOARD_DEFAULT_LANDING'));
assert.ok(initPy.includes('_async_sync_dashboard_sidebar_panel'));
assert.ok(initPy.includes('menstruation-cycle-dashboard-panel.js'));

const optionData = strings.options.step.init.data;
assert.ok(optionData.show_cycle_dashboard);
assert.ok(optionData.cycle_dashboard_default_page);
assert.ok(optionData.dashboard_enabled);
assert.ok(optionData.dashboard_default_landing);

console.log('Dashboard config option tests passed.');
