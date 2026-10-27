'use strict';
// The browser notification permission is asked for when a timer is started (a tap), never when the card loads.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../custom_components/menstruation_cycle/www/menstruation-countdown-timer.js'), 'utf8');
assert.strictEqual((source.match(/Notification\.requestPermission\(/g) || []).length, 1, 'exactly one permission request');

const connected = source.slice(source.indexOf('connectedCallback() {'), source.indexOf('disconnectedCallback'));
assert.ok(connected.length > 50 && !connected.includes('requestPermission'), 'no request while loading');

const startCase = source.slice(source.indexOf('case "start-timer":'), source.indexOf('this.startTimer();', source.indexOf('case "start-timer":')));
assert.ok(startCase.includes('requestPermission') && startCase.includes('reminderEnabled') && startCase.includes('"default"'), 'asked on the start tap, only when reminders are on');
console.log('countdown-notification-permission: ok');
