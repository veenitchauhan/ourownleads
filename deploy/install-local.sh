#!/bin/sh
set -eu
cd /Users/veenit/Sites/whatsapp-chatbot
config=/opt/homebrew/etc/httpd/extra/ourownleads.test.conf
backup="$config.before-our-own-leads-crm"
if [ ! -e "$backup" ]; then cp "$config" "$backup"; fi
cp deploy/ourownleads.test.conf "$config"
if ! /opt/homebrew/bin/httpd -t; then cp "$backup" "$config"; exit 1; fi
mkdir -p /Users/veenit/Library/LaunchAgents
cp deploy/com.ourownleads.portal.plist /Users/veenit/Library/LaunchAgents/com.ourownleads.portal.plist
if launchctl print gui/501/com.ourownleads.portal >/dev/null 2>&1; then
    launchctl kickstart -k gui/501/com.ourownleads.portal
else
    launchctl bootstrap gui/501 /Users/veenit/Library/LaunchAgents/com.ourownleads.portal.plist
fi
sudo /opt/homebrew/bin/httpd -k graceful
