<?php
/**
 * Custom phpMyAdmin configuration for HTTP local / LAN access
 */
$cfg['blowfish_secret'] = 'd8f1a9c4b2e7f0a3c6d9e2b5a8f1c4d7';
$cfg['ForceSSL'] = false;
$cfg['PmaNoRelation_DisableWarning'] = true;
$cfg['LoginCookieValidity'] = 28800; // 8 hours

@ini_set('session.cookie_secure', '0');
@ini_set('session.cookie_httponly', '1');
@ini_set('session.cookie_samesite', 'Lax');

